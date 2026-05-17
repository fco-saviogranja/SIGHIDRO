import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const serverDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(serverDir, '../.env.local') });
dotenv.config({ path: resolve(serverDir, '.env.local') });
dotenv.config({ path: resolve(serverDir, '.env') });
dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const allowInMemoryDb =
  process.env.ALLOW_IN_MEMORY_DB === 'true' ||
  (!isProduction && process.env.ALLOW_IN_MEMORY_DB !== 'false');
const databaseUrl = process.env.DATABASE_URL?.trim();
const jwtSecret = process.env.JWT_SECRET?.trim() || (isProduction ? '' : 'dev-only-sighidro-secret');

if (!process.env.JWT_SECRET?.trim() && !isProduction) {
  console.warn('JWT_SECRET not configured; using a development-only fallback secret.');
}

const isLocalDatabase = databaseUrl && /localhost|127\.0\.0\.1|::1/.test(databaseUrl);
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: !isLocalDatabase ? { rejectUnauthorized: false } : false,
    })
  : null;

let useInMemoryDb = false;
const inMemoryStore = {
  users: new Map(),
  assets: [],
  readings: [],
  maintenance: [],
  audits: [],
};

const assetCategories = ['poço', 'bomba', 'reservatório', 'localidade'];
const statusOptions = ['operando', 'atenção', 'parado', 'manutenção'];
const profileOptions = ['Operador Hidráulico', 'Técnico de Campo', 'Gestor Hídrico', 'Administração Central'];
const maintenanceStatuses = ['aberta', 'em_andamento', 'concluida', 'cancelada'];
const categoryPrefix = {
  poço: 'POC',
  bomba: 'BMB',
  reservatório: 'RES',
  localidade: 'LOC',
};

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
const normalizeRole = (role) => {
  const value = String(role ?? '').trim().toLowerCase();
  if (value === 'admin' || value === 'administrador') return 'administrador';
  if (value === 'gestor') return 'gestor';
  if (value === 'operator' || value === 'operador' || value === 'técnico' || value === 'tecnico') return 'técnico';
  return 'técnico';
};
const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const textOrEmpty = (value) => String(value ?? '').trim();

const mapAssetRow = (row) => ({
  id: row.id,
  code: row.code,
  category: row.category,
  name: row.name,
  location: row.location,
  status: row.status,
  responsible: row.responsible,
  flowRate: row.flow_rate === null || row.flow_rate === undefined ? undefined : Number(row.flow_rate),
  reservoirLevel: row.reservoir_level === null || row.reservoir_level === undefined ? undefined : Number(row.reservoir_level),
  powerHp: row.power_hp === null || row.power_hp === undefined ? undefined : Number(row.power_hp),
  energyType: row.energy_type ?? undefined,
  depthMeters: row.depth_meters === null || row.depth_meters === undefined ? undefined : Number(row.depth_meters),
  capacityM3: row.capacity_m3 === null || row.capacity_m3 === undefined ? undefined : Number(row.capacity_m3),
  latitude: row.latitude === null || row.latitude === undefined ? undefined : Number(row.latitude),
  longitude: row.longitude === null || row.longitude === undefined ? undefined : Number(row.longitude),
  lastReading: row.last_reading ?? '',
  notes: row.notes ?? '',
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapReadingRow = (row) => ({
  id: row.id,
  assetId: row.asset_id,
  readingAt: row.reading_at instanceof Date ? row.reading_at.toISOString() : row.reading_at,
  flowRate: row.flow_rate === null || row.flow_rate === undefined ? undefined : Number(row.flow_rate),
  reservoirLevel: row.reservoir_level === null || row.reservoir_level === undefined ? undefined : Number(row.reservoir_level),
  operatorName: row.operator_name ?? '',
  notes: row.notes ?? '',
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});

const mapMaintenanceRow = (row) => ({
  id: row.id,
  assetId: row.asset_id,
  service: row.service,
  status: row.status,
  responsible: row.responsible,
  dueDate: row.due_date ? String(row.due_date).slice(0, 10) : undefined,
  notes: row.notes ?? '',
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const groupAssets = (assets) =>
  assetCategories.reduce((registry, category) => {
    registry[category] = assets.filter((asset) => asset.category === category);
    return registry;
  }, {});

const normalizeAssetPayload = (payload, { partial = false } = {}) => {
  const data = {};

  if (!partial || payload.category !== undefined) {
    const category = textOrEmpty(payload.category);
    if (!assetCategories.includes(category)) {
      return { error: 'Tipo de ativo inválido.' };
    }
    data.category = category;
  }

  if (!partial || payload.name !== undefined) {
    data.name = textOrEmpty(payload.name);
    if (!data.name) return { error: 'Nome é obrigatório.' };
  }

  if (!partial || payload.location !== undefined) {
    data.location = textOrEmpty(payload.location);
    if (!data.location) return { error: 'Localização é obrigatória.' };
  }

  if (!partial || payload.status !== undefined) {
    const status = textOrEmpty(payload.status);
    if (!statusOptions.includes(status)) return { error: 'Status inválido.' };
    data.status = status;
  }

  if (!partial || payload.responsible !== undefined) {
    const responsible = textOrEmpty(payload.responsible);
    if (!profileOptions.includes(responsible)) return { error: 'Responsável inválido.' };
    data.responsible = responsible;
  }

  for (const field of ['flowRate', 'reservoirLevel', 'powerHp', 'depthMeters', 'capacityM3', 'latitude', 'longitude']) {
    if (!partial || payload[field] !== undefined) {
      data[field] = numberOrNull(payload[field]);
    }
  }

  if (!partial || payload.energyType !== undefined) data.energyType = textOrEmpty(payload.energyType) || null;
  if (!partial || payload.lastReading !== undefined) data.lastReading = textOrEmpty(payload.lastReading);
  if (!partial || payload.notes !== undefined) data.notes = textOrEmpty(payload.notes);

  return { data };
};

const normalizeReadingPayload = (payload) => {
  const readingAt = payload.readingAt ? new Date(payload.readingAt) : new Date();
  if (Number.isNaN(readingAt.getTime())) {
    return { error: 'Data da leitura inválida.' };
  }

  return {
    data: {
      flowRate: numberOrNull(payload.flowRate),
      operatorName: textOrEmpty(payload.operatorName),
      notes: textOrEmpty(payload.notes),
      readingAt,
      reservoirLevel: numberOrNull(payload.reservoirLevel),
    },
  };
};

const normalizeMaintenancePayload = (payload, { partial = false } = {}) => {
  const data = {};

  if (!partial || payload.service !== undefined) {
    data.service = textOrEmpty(payload.service);
    if (!data.service) return { error: 'Serviço é obrigatório.' };
  }

  if (!partial || payload.status !== undefined) {
    const status = textOrEmpty(payload.status || 'aberta');
    if (!maintenanceStatuses.includes(status)) return { error: 'Status da manutenção inválido.' };
    data.status = status;
  }

  if (!partial || payload.responsible !== undefined) {
    const responsible = textOrEmpty(payload.responsible || 'Técnico de Campo');
    if (!profileOptions.includes(responsible)) return { error: 'Responsável inválido.' };
    data.responsible = responsible;
  }

  if (!partial || payload.dueDate !== undefined) data.dueDate = textOrEmpty(payload.dueDate) || null;
  if (!partial || payload.notes !== undefined) data.notes = textOrEmpty(payload.notes);

  return { data };
};

const ensureSchema = async () => {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured.');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'técnico',
      created_at timestamptz DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'técnico';
  `);

  await pool.query(`
    ALTER TABLE users
    ALTER COLUMN role SET DEFAULT 'técnico';
  `);

  await pool.query(`
    UPDATE users SET role = 'administrador' WHERE role = 'admin';
    UPDATE users SET role = 'técnico' WHERE role IN ('operator', 'operador');
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hydro_assets (
      id text PRIMARY KEY,
      code text UNIQUE NOT NULL,
      category text NOT NULL,
      name text NOT NULL,
      location text NOT NULL,
      status text NOT NULL,
      responsible text NOT NULL,
      flow_rate numeric,
      reservoir_level numeric,
      power_hp numeric,
      energy_type text,
      depth_meters numeric,
      capacity_m3 numeric,
      latitude numeric,
      longitude numeric,
      last_reading text NOT NULL DEFAULT '',
      notes text NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hydro_asset_readings (
      id text PRIMARY KEY,
      asset_id text NOT NULL REFERENCES hydro_assets(id) ON DELETE CASCADE,
      reading_at timestamptz NOT NULL,
      flow_rate numeric,
      reservoir_level numeric,
      operator_name text NOT NULL DEFAULT '',
      notes text NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hydro_maintenance_orders (
      id text PRIMARY KEY,
      asset_id text NOT NULL REFERENCES hydro_assets(id) ON DELETE CASCADE,
      service text NOT NULL,
      status text NOT NULL DEFAULT 'aberta',
      responsible text NOT NULL,
      due_date date,
      notes text NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      user_email text NOT NULL,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id text NOT NULL,
      before_data jsonb,
      after_data jsonb,
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

const ensureAdminUser = async () => {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('ADMIN_EMAIL/ADMIN_PASSWORD not configured; admin user was not seeded.');
    return;
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (useInMemoryDb) {
    const existing = inMemoryStore.users.get(email);
    if (existing) {
      existing.password_hash = passwordHash;
      existing.role = 'administrador';
      console.log(`Admin user ensured (in-memory): ${email}`);
      return;
    }

    const user = { id: crypto.randomUUID(), email, password_hash: passwordHash, role: 'administrador' };
    inMemoryStore.users.set(email, user);
    console.log(`Admin user created (in-memory): ${email}`);
    return;
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    await pool.query('UPDATE users SET password_hash = $1, role = $2 WHERE email = $3', [passwordHash, 'administrador', email]);
    console.log(`Admin user ensured: ${email}`);
    return;
  }

  await pool.query('INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)', [
    crypto.randomUUID(),
    email,
    passwordHash,
    'administrador',
  ]);
  console.log(`Admin user created: ${email}`);
};

const signToken = (user) => {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' });
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
    req.user = { id: payload.sub, email: payload.email, role: normalizeRole(payload.role ?? 'técnico') };
  } catch {
    return res.status(401).json({ error: 'Invalid token.' });
  }

  return next();
};

const writeAudit = async (user, action, entityType, entityId, beforeData, afterData) => {
  const entry = {
    id: makeId('audit'),
    userId: user.id,
    email: user.email,
    action,
    entityType,
    entityId,
    before: beforeData ?? null,
    after: afterData ?? null,
    createdAt: nowIso(),
  };

  if (useInMemoryDb) {
    inMemoryStore.audits.unshift(entry);
    return entry;
  }

  await pool.query(
    `
    INSERT INTO audit_log (id, user_id, user_email, action, entity_type, entity_id, before_data, after_data)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
  `,
    [
      entry.id,
      user.id,
      user.email,
      action,
      entityType,
      entityId,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
    ],
  );

  return entry;
};

const filterAssets = (assets, query) => {
  const q = textOrEmpty(query.q).toLowerCase();
  const location = textOrEmpty(query.location).toLowerCase();

  return assets.filter((asset) => {
    if (query.category && query.category !== 'all' && asset.category !== query.category) return false;
    if (query.status && query.status !== 'all' && asset.status !== query.status) return false;
    if (query.responsible && query.responsible !== 'all' && asset.responsible !== query.responsible) return false;
    if (location && !asset.location.toLowerCase().includes(location)) return false;
    if (!q) return true;
    return [asset.code, asset.name, asset.location, asset.responsible, asset.notes]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });
};

const fetchAssets = async (query = {}) => {
  if (useInMemoryDb) {
    return filterAssets(inMemoryStore.assets, query);
  }

  const where = [];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (query.category && query.category !== 'all') where.push(`category = ${addParam(query.category)}`);
  if (query.status && query.status !== 'all') where.push(`status = ${addParam(query.status)}`);
  if (query.responsible && query.responsible !== 'all') where.push(`responsible = ${addParam(query.responsible)}`);
  if (query.location) where.push(`location ILIKE ${addParam(`%${query.location}%`)}`);
  if (query.q) {
    const value = addParam(`%${query.q}%`);
    where.push(`(code ILIKE ${value} OR name ILIKE ${value} OR location ILIKE ${value} OR responsible ILIKE ${value} OR notes ILIKE ${value})`);
  }

  const result = await pool.query(
    `
    SELECT * FROM hydro_assets
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC
  `,
    params,
  );
  return result.rows.map(mapAssetRow);
};

const findAsset = async (id) => {
  if (useInMemoryDb) {
    return inMemoryStore.assets.find((asset) => asset.id === id) ?? null;
  }

  const result = await pool.query('SELECT * FROM hydro_assets WHERE id = $1', [id]);
  return result.rows[0] ? mapAssetRow(result.rows[0]) : null;
};

const generateAssetCode = async (category) => {
  const prefix = categoryPrefix[category];
  const assets = await fetchAssets({ category });
  const max = assets.reduce((highest, asset) => {
    const current = Number(asset.code.replace(/\D/g, ''));
    return Number.isFinite(current) ? Math.max(highest, current) : highest;
  }, 0);

  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
};

const csvEscape = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const assetsToCsv = (assets) => {
  const headers = ['Codigo', 'Nome', 'Tipo', 'Localizacao', 'Status', 'Responsavel', 'Vazao', 'Nivel', 'Atualizado em'];
  const rows = assets.map((asset) => [
    asset.code,
    asset.name,
    asset.category,
    asset.location,
    asset.status,
    asset.responsible,
    asset.flowRate ?? '',
    asset.reservoirLevel ?? '',
    asset.updatedAt,
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
};

const normalizeRegistryPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const registry = payload.registry || payload.data || payload;
  if (!registry || typeof registry !== 'object') return null;
  return assetCategories.flatMap((category) =>
    Array.isArray(registry[category])
      ? registry[category].map((asset) => ({ ...asset, category })).filter((asset) => asset.name && asset.location)
      : [],
  );
};

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: useInMemoryDb ? 'memory' : 'postgres',
    mode: process.env.NODE_ENV || 'development',
    admin: {
      email: normalizeEmail(process.env.ADMIN_EMAIL) || null,
      configured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
    },
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    if (useInMemoryDb) {
      if (inMemoryStore.users.has(normalizedEmail)) return res.status(409).json({ error: 'Email already registered.' });
      const passwordHash = await bcrypt.hash(password, 10);
      const role = normalizedEmail === normalizeEmail(process.env.ADMIN_EMAIL) ? 'administrador' : 'técnico';
      const user = { id: crypto.randomUUID(), email: normalizedEmail, password_hash: passwordHash, role };
      inMemoryStore.users.set(normalizedEmail, user);
      return res.status(201).json({ user: { id: user.id, email: user.email, role: user.role } });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const role = normalizedEmail === normalizeEmail(process.env.ADMIN_EMAIL) ? 'administrador' : 'técnico';
    const user = { id: crypto.randomUUID(), email: normalizedEmail, role };
    await pool.query('INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)', [
      user.id,
      user.email,
      passwordHash,
      user.role,
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
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) return res.status(400).json({ error: 'Email and password are required.' });

    if (useInMemoryDb) {
      const user = inMemoryStore.users.get(normalizedEmail);
      if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
      const matches = await bcrypt.compare(password, user.password_hash);
      if (!matches) return res.status(401).json({ error: 'Invalid credentials.' });
      const role = normalizeRole(user.role);
      const token = signToken({ id: user.id, email: user.email, role });
      return res.json({ token, user: { id: user.id, email: user.email, role } });
    }

    const result = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [normalizedEmail]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });

    const user = result.rows[0];
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) return res.status(401).json({ error: 'Invalid credentials.' });

    const role = normalizeRole(user.role);
    const token = signToken({ id: user.id, email: user.email, role });
    return res.json({ token, user: { id: user.id, email: user.email, role } });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ error: 'Unable to login.' });
  }
});

app.get('/api/assets', requireAuth, async (req, res) => {
  try {
    const assets = await fetchAssets(req.query);
    return res.json({ data: assets });
  } catch (error) {
    console.error('List assets error', error);
    return res.status(500).json({ error: 'Unable to list assets.' });
  }
});

app.get('/api/assets/export.csv', requireAuth, async (req, res) => {
  try {
    const assets = await fetchAssets(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cadastro-hidrico.csv"');
    return res.send(assetsToCsv(assets));
  } catch (error) {
    console.error('Export assets error', error);
    return res.status(500).json({ error: 'Unable to export assets.' });
  }
});

app.post('/api/assets', requireAuth, async (req, res) => {
  try {
    const normalized = normalizeAssetPayload(req.body ?? {});
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const id = makeId('asset');
    const code = await generateAssetCode(normalized.data.category);
    const now = nowIso();
    const asset = {
      ...normalized.data,
      id,
      code,
      createdAt: now,
      updatedAt: now,
    };

    if (useInMemoryDb) {
      inMemoryStore.assets.unshift(asset);
      await writeAudit(req.user, 'create', 'asset', id, null, asset);
      return res.status(201).json({ data: asset });
    }

    const result = await pool.query(
      `
      INSERT INTO hydro_assets (
        id, code, category, name, location, status, responsible, flow_rate, reservoir_level,
        power_hp, energy_type, depth_meters, capacity_m3, latitude, longitude, last_reading, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `,
      [
        id,
        code,
        asset.category,
        asset.name,
        asset.location,
        asset.status,
        asset.responsible,
        asset.flowRate,
        asset.reservoirLevel,
        asset.powerHp,
        asset.energyType,
        asset.depthMeters,
        asset.capacityM3,
        asset.latitude,
        asset.longitude,
        asset.lastReading,
        asset.notes,
      ],
    );
    const created = mapAssetRow(result.rows[0]);
    await writeAudit(req.user, 'create', 'asset', id, null, created);
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error('Create asset error', error);
    return res.status(500).json({ error: 'Unable to create asset.' });
  }
});

app.get('/api/assets/:id', requireAuth, async (req, res) => {
  try {
    const asset = await findAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found.' });
    return res.json({ data: asset });
  } catch (error) {
    console.error('Get asset error', error);
    return res.status(500).json({ error: 'Unable to load asset.' });
  }
});

app.patch('/api/assets/:id', requireAuth, async (req, res) => {
  try {
    const before = await findAsset(req.params.id);
    if (!before) return res.status(404).json({ error: 'Asset not found.' });

    const normalized = normalizeAssetPayload({ ...before, ...req.body, category: before.category }, { partial: false });
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    if (useInMemoryDb) {
      const updated = {
        ...before,
        ...normalized.data,
        category: before.category,
        code: before.code,
        createdAt: before.createdAt,
        id: before.id,
        updatedAt: nowIso(),
      };
      inMemoryStore.assets = inMemoryStore.assets.map((asset) => (asset.id === before.id ? updated : asset));
      await writeAudit(req.user, 'update', 'asset', before.id, before, updated);
      return res.json({ data: updated });
    }

    const result = await pool.query(
      `
      UPDATE hydro_assets
      SET name = $2, location = $3, status = $4, responsible = $5, flow_rate = $6,
        reservoir_level = $7, power_hp = $8, energy_type = $9, depth_meters = $10,
        capacity_m3 = $11, latitude = $12, longitude = $13, last_reading = $14,
        notes = $15, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
      [
        before.id,
        normalized.data.name,
        normalized.data.location,
        normalized.data.status,
        normalized.data.responsible,
        normalized.data.flowRate,
        normalized.data.reservoirLevel,
        normalized.data.powerHp,
        normalized.data.energyType,
        normalized.data.depthMeters,
        normalized.data.capacityM3,
        normalized.data.latitude,
        normalized.data.longitude,
        normalized.data.lastReading,
        normalized.data.notes,
      ],
    );
    const updated = mapAssetRow(result.rows[0]);
    await writeAudit(req.user, 'update', 'asset', before.id, before, updated);
    return res.json({ data: updated });
  } catch (error) {
    console.error('Update asset error', error);
    return res.status(500).json({ error: 'Unable to update asset.' });
  }
});

app.delete('/api/assets/:id', requireAuth, async (req, res) => {
  try {
    const before = await findAsset(req.params.id);
    if (!before) return res.status(404).json({ error: 'Asset not found.' });

    if (useInMemoryDb) {
      inMemoryStore.assets = inMemoryStore.assets.filter((asset) => asset.id !== before.id);
      inMemoryStore.readings = inMemoryStore.readings.filter((reading) => reading.assetId !== before.id);
      inMemoryStore.maintenance = inMemoryStore.maintenance.filter((order) => order.assetId !== before.id);
      await writeAudit(req.user, 'delete', 'asset', before.id, before, null);
      return res.status(204).send();
    }

    await pool.query('DELETE FROM hydro_assets WHERE id = $1', [before.id]);
    await writeAudit(req.user, 'delete', 'asset', before.id, before, null);
    return res.status(204).send();
  } catch (error) {
    console.error('Delete asset error', error);
    return res.status(500).json({ error: 'Unable to delete asset.' });
  }
});

app.get('/api/assets/:id/readings', requireAuth, async (req, res) => {
  try {
    if (useInMemoryDb) {
      return res.json({ data: inMemoryStore.readings.filter((reading) => reading.assetId === req.params.id) });
    }

    const result = await pool.query('SELECT * FROM hydro_asset_readings WHERE asset_id = $1 ORDER BY reading_at DESC', [
      req.params.id,
    ]);
    return res.json({ data: result.rows.map(mapReadingRow) });
  } catch (error) {
    console.error('List readings error', error);
    return res.status(500).json({ error: 'Unable to list readings.' });
  }
});

app.post('/api/assets/:id/readings', requireAuth, async (req, res) => {
  try {
    const asset = await findAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found.' });

    const normalized = normalizeReadingPayload(req.body ?? {});
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const id = makeId('reading');
    if (useInMemoryDb) {
      const reading = {
        assetId: asset.id,
        createdAt: nowIso(),
        flowRate: normalized.data.flowRate ?? undefined,
        id,
        notes: normalized.data.notes,
        operatorName: normalized.data.operatorName,
        readingAt: normalized.data.readingAt.toISOString(),
        reservoirLevel: normalized.data.reservoirLevel ?? undefined,
      };
      inMemoryStore.readings.unshift(reading);
      inMemoryStore.assets = inMemoryStore.assets.map((item) =>
        item.id === asset.id
          ? {
              ...item,
              flowRate: reading.flowRate ?? item.flowRate,
              lastReading: reading.readingAt,
              reservoirLevel: reading.reservoirLevel ?? item.reservoirLevel,
              updatedAt: nowIso(),
            }
          : item,
      );
      await writeAudit(req.user, 'create', 'reading', id, null, reading);
      return res.status(201).json({ data: reading });
    }

    const result = await pool.query(
      `
      INSERT INTO hydro_asset_readings (id, asset_id, reading_at, flow_rate, reservoir_level, operator_name, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        id,
        asset.id,
        normalized.data.readingAt,
        normalized.data.flowRate,
        normalized.data.reservoirLevel,
        normalized.data.operatorName,
        normalized.data.notes,
      ],
    );
    const reading = mapReadingRow(result.rows[0]);
    await pool.query(
      `
      UPDATE hydro_assets
      SET flow_rate = COALESCE($2, flow_rate),
        reservoir_level = COALESCE($3, reservoir_level),
        last_reading = $4,
        updated_at = NOW()
      WHERE id = $1
    `,
      [asset.id, normalized.data.flowRate, normalized.data.reservoirLevel, reading.readingAt],
    );
    await writeAudit(req.user, 'create', 'reading', id, null, reading);
    return res.status(201).json({ data: reading });
  } catch (error) {
    console.error('Create reading error', error);
    return res.status(500).json({ error: 'Unable to create reading.' });
  }
});

app.get('/api/assets/:id/maintenance', requireAuth, async (req, res) => {
  try {
    if (useInMemoryDb) {
      return res.json({ data: inMemoryStore.maintenance.filter((order) => order.assetId === req.params.id) });
    }

    const result = await pool.query('SELECT * FROM hydro_maintenance_orders WHERE asset_id = $1 ORDER BY created_at DESC', [
      req.params.id,
    ]);
    return res.json({ data: result.rows.map(mapMaintenanceRow) });
  } catch (error) {
    console.error('List maintenance error', error);
    return res.status(500).json({ error: 'Unable to list maintenance.' });
  }
});

app.post('/api/assets/:id/maintenance', requireAuth, async (req, res) => {
  try {
    const asset = await findAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found.' });

    const normalized = normalizeMaintenancePayload(req.body ?? {});
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const id = makeId('maintenance');
    const now = nowIso();
    if (useInMemoryDb) {
      const order = {
        ...normalized.data,
        assetId: asset.id,
        createdAt: now,
        dueDate: normalized.data.dueDate || undefined,
        id,
        updatedAt: now,
      };
      inMemoryStore.maintenance.unshift(order);
      await writeAudit(req.user, 'create', 'maintenance', id, null, order);
      return res.status(201).json({ data: order });
    }

    const result = await pool.query(
      `
      INSERT INTO hydro_maintenance_orders (id, asset_id, service, status, responsible, due_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        id,
        asset.id,
        normalized.data.service,
        normalized.data.status,
        normalized.data.responsible,
        normalized.data.dueDate,
        normalized.data.notes,
      ],
    );
    const order = mapMaintenanceRow(result.rows[0]);
    await writeAudit(req.user, 'create', 'maintenance', id, null, order);
    return res.status(201).json({ data: order });
  } catch (error) {
    console.error('Create maintenance error', error);
    return res.status(500).json({ error: 'Unable to create maintenance.' });
  }
});

app.patch('/api/assets/:id/maintenance', requireAuth, async (req, res) => {
  try {
    const orderId = textOrEmpty(req.body?.id);
    if (!orderId) return res.status(400).json({ error: 'Maintenance id is required.' });

    const normalized = normalizeMaintenancePayload(req.body ?? {}, { partial: true });
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    if (useInMemoryDb) {
      const before = inMemoryStore.maintenance.find((order) => order.id === orderId && order.assetId === req.params.id);
      if (!before) return res.status(404).json({ error: 'Maintenance order not found.' });
      const updated = { ...before, ...normalized.data, updatedAt: nowIso() };
      inMemoryStore.maintenance = inMemoryStore.maintenance.map((order) => (order.id === orderId ? updated : order));
      await writeAudit(req.user, 'update', 'maintenance', orderId, before, updated);
      return res.json({ data: updated });
    }

    const beforeResult = await pool.query('SELECT * FROM hydro_maintenance_orders WHERE id = $1 AND asset_id = $2', [
      orderId,
      req.params.id,
    ]);
    if (!beforeResult.rows[0]) return res.status(404).json({ error: 'Maintenance order not found.' });
    const before = mapMaintenanceRow(beforeResult.rows[0]);
    const merged = { ...before, ...normalized.data };
    const result = await pool.query(
      `
      UPDATE hydro_maintenance_orders
      SET service = $3, status = $4, responsible = $5, due_date = $6, notes = $7, updated_at = NOW()
      WHERE id = $1 AND asset_id = $2
      RETURNING *
    `,
      [orderId, req.params.id, merged.service, merged.status, merged.responsible, merged.dueDate, merged.notes],
    );
    const updated = mapMaintenanceRow(result.rows[0]);
    await writeAudit(req.user, 'update', 'maintenance', orderId, before, updated);
    return res.json({ data: updated });
  } catch (error) {
    console.error('Update maintenance error', error);
    return res.status(500).json({ error: 'Unable to update maintenance.' });
  }
});

app.get('/api/registry', requireAuth, async (_req, res) => {
  try {
    const assets = await fetchAssets();
    return res.json({ data: groupAssets(assets) });
  } catch (error) {
    console.error('Load registry compatibility error', error);
    return res.status(500).json({ error: 'Unable to load registry.' });
  }
});

app.put('/api/registry', requireAuth, async (req, res) => {
  try {
    const incoming = normalizeRegistryPayload(req.body);
    if (!incoming) return res.status(400).json({ error: 'Invalid registry payload.' });

    const imported = [];
    for (const raw of incoming) {
      const normalized = normalizeAssetPayload(raw);
      if (normalized.error) continue;
      const id = raw.id || makeId('asset');
      const code = raw.code || (await generateAssetCode(normalized.data.category));
      const now = nowIso();
      if (useInMemoryDb) {
        const asset = { ...normalized.data, id, code, createdAt: raw.createdAt || now, updatedAt: now };
        inMemoryStore.assets = inMemoryStore.assets.filter((item) => item.id !== id);
        inMemoryStore.assets.push(asset);
        imported.push(asset);
      } else {
        const result = await pool.query(
          `
          INSERT INTO hydro_assets (
            id, code, category, name, location, status, responsible, flow_rate, reservoir_level,
            power_hp, energy_type, depth_meters, capacity_m3, latitude, longitude, last_reading, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id)
          DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location, status = EXCLUDED.status,
            responsible = EXCLUDED.responsible, flow_rate = EXCLUDED.flow_rate,
            reservoir_level = EXCLUDED.reservoir_level, power_hp = EXCLUDED.power_hp,
            energy_type = EXCLUDED.energy_type, depth_meters = EXCLUDED.depth_meters,
            capacity_m3 = EXCLUDED.capacity_m3, latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude, last_reading = EXCLUDED.last_reading,
            notes = EXCLUDED.notes, updated_at = NOW()
          RETURNING *
        `,
          [
            id,
            code,
            normalized.data.category,
            normalized.data.name,
            normalized.data.location,
            normalized.data.status,
            normalized.data.responsible,
            normalized.data.flowRate,
            normalized.data.reservoirLevel,
            normalized.data.powerHp,
            normalized.data.energyType,
            normalized.data.depthMeters,
            normalized.data.capacityM3,
            normalized.data.latitude,
            normalized.data.longitude,
            normalized.data.lastReading,
            normalized.data.notes,
          ],
        );
        imported.push(mapAssetRow(result.rows[0]));
      }
    }

    await writeAudit(req.user, 'update', 'asset', 'legacy-registry-import', null, imported);
    return res.json({ data: groupAssets(imported) });
  } catch (error) {
    console.error('Save registry compatibility error', error);
    return res.status(500).json({ error: 'Unable to save registry.' });
  }
});

const start = async () => {
  try {
    if (!jwtSecret) throw new Error('JWT_SECRET is not configured.');

    await ensureSchema();
    await ensureAdminUser();
    app.listen(port, host, () => {
      console.log(`SIGHIDRO API listening on ${host}:${port}`);
    });
  } catch (error) {
    if (!allowInMemoryDb) {
      console.error('Startup error; in-memory fallback is disabled:', error && error.message ? error.message : error);
      throw error;
    }

    console.warn('Startup error, falling back to in-memory DB:', error && error.message ? error.message : error);
    useInMemoryDb = true;
    try {
      await ensureAdminUser();
    } catch (err) {
      console.warn('Failed to seed admin user in-memory:', err && err.message ? err.message : err);
    }
    app.listen(port, host, () => {
      console.log(`SIGHIDRO API listening on ${host}:${port} (in-memory mode)`);
    });
  }
};

start().catch((error) => {
  console.error('Critical startup error', error);
  process.exit(1);
});
