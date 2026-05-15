import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Pool } from 'pg';

const app = express();
const port = Number(process.env.PORT) || 4000;
const jwtSecret = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

const normalizeRegistryPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const registry = payload.registry || payload.data || payload;
  if (!registry || typeof registry !== 'object') {
    return null;
  }

  return {
    'po\u00E7o': Array.isArray(registry['po\u00E7o']) ? registry['po\u00E7o'] : [],
    bomba: Array.isArray(registry.bomba) ? registry.bomba : [],
    'reservat\u00F3rio': Array.isArray(registry['reservat\u00F3rio']) ? registry['reservat\u00F3rio'] : [],
    localidade: Array.isArray(registry.localidade) ? registry.localidade : [],
  };
};

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      created_at timestamptz DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hydro_registry (
      user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data jsonb NOT NULL,
      updated_at timestamptz DEFAULT NOW()
    );
  `);
};

const signToken = (user) => {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
};

const requireAuth = (req, res, next) => {
  const header = req.get('authorization');
  if (!header) {
    return res.status(401).json({ error: 'Missing authorization header.' });
  }

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid authorization header.' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
  } catch {
    return res.status(401).json({ error: 'Invalid token.' });
  }

  return next();
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id: crypto.randomUUID(), email };

    await pool.query('INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)', [
      user.id,
      user.email,
      passwordHash,
    ]);

    return res.status(201).json({ user });
  } catch (error) {
    console.error('Register error', error);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signToken({ id: user.id, email });
    return res.json({ token, user: { id: user.id, email } });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ error: 'Unable to login.' });
  }
});

app.get('/api/registry', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM hydro_registry WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.json({ data: null });
    }

    return res.json({ data: result.rows[0].data });
  } catch (error) {
    console.error('Load registry error', error);
    return res.status(500).json({ error: 'Unable to load registry.' });
  }
});

app.put('/api/registry', requireAuth, async (req, res) => {
  try {
    const registry = normalizeRegistryPayload(req.body);
    if (!registry) {
      return res.status(400).json({ error: 'Invalid registry payload.' });
    }

    await pool.query(
      `
      INSERT INTO hydro_registry (user_id, data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
    `,
      [req.user.id, registry],
    );

    return res.json({ data: registry });
  } catch (error) {
    console.error('Save registry error', error);
    return res.status(500).json({ error: 'Unable to save registry.' });
  }
});

const start = async () => {
  await ensureSchema();
  app.listen(port, () => {
    console.log(`SIGHIDRO API listening on ${port}`);
  });
};

start().catch((error) => {
  console.error('Startup error', error);
  process.exit(1);
});
