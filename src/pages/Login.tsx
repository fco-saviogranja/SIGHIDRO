import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';

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
  const [showPassword, setShowPassword] = useState(false);
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
          <div className="auth-brand-panel">
            <img className="auth-brand-logo-large" src="/logo.png" alt="Logo SIGHIDRO" />
            <strong>SIGHIDRO</strong>
            <small>Sistema Integrado de Gestão Hídrica</small>
            <p>
              Gestão hídrica municipal. Acesse para administrar, monitorar e otimizar os processos
              do abastecimento público.
            </p>
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
          <div className="auth-login-shell">
            <img className="auth-login-mark" src="/logo.png" alt="" />
            <div className="auth-login-card">
              <div className="auth-login-heading">
                <h2>{mode === 'login' ? 'Login de Acesso' : 'Criar conta'}</h2>
                <p>
                  {mode === 'login'
                    ? 'Bem-vindo(a) de volta! Insira suas credenciais.'
                    : 'Informe seus dados para criar uma sessão institucional.'}
                </p>
              </div>

              <div className="auth-login-fields">
                <label>
                  E-mail ou Usuário
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="controleinterno@jardim.ce.gov.br"
                  />
                </label>
                <label>
                  Senha
                  <span className="auth-password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={mode === 'login' ? 'Digite sua senha' : 'Crie uma senha segura'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
              </div>

              <p className="auth-browser-note">
                Após o login, o navegador poderá manter sua sessão salva neste dispositivo.
              </p>

              {error ? <p className="auth-error">{error}</p> : null}

              <button className="auth-forgot" type="button">
                Esqueci minha senha
              </button>

              <button className="primary-action auth-submit-button" type="submit" disabled={isBusy}>
                {isBusy ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
                {!isBusy ? <ArrowRight size={17} /> : null}
              </button>

              <button className="auth-toggle" type="button" onClick={toggleMode}>
                {mode === 'login' ? 'Criar conta' : 'Voltar para login'}
              </button>
            </div>
          </div>
        </motion.form>
      </section>
    </main>
  );
}

export default LoginPage;
