import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Droplets, ShieldCheck } from 'lucide-react';
import { useAuth } from '../AuthContext';

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
        <div className="auth-intro">
          <div className="auth-brand">
            <span className="brand-mark">
              <Droplets size={28} />
            </span>
            <div>
              <strong>SIGHIDRO</strong>
              <small>SAAE de Jardim</small>
            </div>
          </div>
          <h1>Gestão hídrica municipal com controle operacional.</h1>
          <p>
            Acesse o ambiente institucional para acompanhar ativos, alertas, manutenção e
            relatórios do abastecimento público.
          </p>
          <div className="auth-proof">
            <span>Cadastro hídrico</span>
            <span>Monitoramento</span>
            <span>Auditoria</span>
          </div>
        </div>

        <form className="panel auth-card" onSubmit={handleSubmit}>
          <div className="form-heading">
            <span className="module-icon">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h2>{mode === 'login' ? 'Acesso institucional' : 'Criar conta'}</h2>
              <p>Gerencie o cadastro hídrico com dados sincronizados via API.</p>
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
            </button>
            <button className="auth-toggle" type="button" onClick={toggleMode}>
              {mode === 'login' ? 'Criar conta' : 'Voltar para login'}
            </button>
          </div>

          <p className="auth-note">
            O token de acesso fica salvo localmente para sincronizar o cadastro com o Render.
          </p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
