import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Database, Droplets, LockKeyhole, ShieldCheck, Signal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';

const proofItems = [
  { label: 'Cadastro hídrico', icon: Database },
  { label: 'Monitoramento', icon: Activity },
  { label: 'Auditoria', icon: ShieldCheck },
];

const accessSignals = [
  { label: 'Sincronização', value: 'API' },
  { label: 'Perfil', value: 'Admin' },
  { label: 'Sessão', value: 'Local' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function LoginPage() {
  const { isAuthenticated, login, register, isBusy } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Falha ao autenticar.';
      setError(message);
    }
  };

  const toggleMode = () => {
    setError(null);
    setMode((current) => (current === 'login' ? 'register' : 'login'));
  };

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <motion.div
          className="auth-intro"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.36, ease: 'easeOut' }}
        >
          <div className="auth-brand">
            <span className="brand-mark">
              <Droplets size={28} />
            </span>
            <div>
              <strong>SIGHIDRO</strong>
              <small>SAAE de Jardim</small>
            </div>
          </div>

          <div className="auth-intro-copy">
            <span className="auth-eyebrow">Acesso seguro ao centro operacional</span>
            <h1>Gestão hídrica municipal com controle operacional.</h1>
            <p>
              Entre no ambiente institucional para acompanhar ativos, alertas, manutenção e
              relatórios do abastecimento público.
            </p>
          </div>

          <div className="auth-console" aria-hidden="true">
            <div className="auth-console-header">
              <span />
              <strong>Sessão protegida</strong>
            </div>
            <div className="auth-console-grid">
              {accessSignals.map((item) => (
                <article key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
            <div className="auth-console-status">
              <Signal size={16} />
              Canal operacional estável
            </div>
          </div>

          <div className="auth-proof">
            {proofItems.map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.label}>
                  <Icon size={15} />
                  {item.label}
                </span>
              );
            })}
          </div>
        </motion.div>

        <motion.form
          className="panel auth-card"
          onSubmit={handleSubmit}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.36, delay: 0.06, ease: 'easeOut' }}
        >
          <div className="form-heading">
            <span className="module-icon">
              <LockKeyhole size={22} />
            </span>
            <div>
              <h2>{mode === 'login' ? 'Acesso institucional' : 'Criar conta'}</h2>
              <p>Autentique sua sessão para acessar o painel operacional do SIGHIDRO.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Email institucional
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@saae.gov.br"
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'login' ? 'Digite sua senha' : 'Crie uma senha segura'}
              />
            </label>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <div className="auth-actions">
            <button className="primary-action" type="submit" disabled={isBusy}>
              {isBusy ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              {!isBusy ? <ArrowRight size={17} /> : null}
            </button>
            <button className="auth-toggle" type="button" onClick={toggleMode}>
              {mode === 'login' ? 'Criar conta' : 'Voltar para login'}
            </button>
          </div>

          <p className="auth-note">
            O token de acesso fica salvo localmente para sincronizar o cadastro com o Render.
          </p>
        </motion.form>
      </section>
    </main>
  );
}

export default LoginPage;
