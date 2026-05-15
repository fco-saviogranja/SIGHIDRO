import { useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Bell, Droplets, Menu, Settings, X } from 'lucide-react';
import CadastroHidrico from './pages/CadastroHidrico';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/Login';
import ModulePage from './pages/ModulePage';
import { useAuth } from './AuthContext';
import { navItems, userContext } from './metadata';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="cadastro" element={<CadastroHidrico />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="monitoramento" element={<ModulePage variant="monitoramento" />} />
        <Route path="manutencao" element={<ModulePage variant="manutencao" />} />
        <Route path="mapa" element={<ModulePage variant="mapa" />} />
        <Route path="relatorios" element={<ModulePage variant="relatorios" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  return (
    <div className="app-shell">
      <Header />
      <Outlet />
    </div>
  );
}

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, userEmail, logout } = useAuth();
  const BadgeIcon = userContext.badgeIcon;

  const renderNav = (className: string) => (
    <nav className={className} aria-label="Navegação principal">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            end={item.path === '/'}
            key={item.path}
            to={item.path}
            onClick={() => setIsMenuOpen(false)}
          >
            <Icon size={18} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <header className="topbar">
      <NavLink className="brand-lockup" to="/" aria-label="Ir para o dashboard">
        <div className="brand-mark" aria-hidden="true">
          <Droplets size={28} />
        </div>
        <div>
          <strong>SIGHIDRO</strong>
          <span>Sistema Integrado de Gestão Hídrica do SAAE de Jardim</span>
        </div>
      </NavLink>

      {renderNav('desktop-nav')}

      <div className="topbar-actions">
        <button className="icon-button" type="button" aria-label="Notificações">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
        <button className="icon-button" type="button" aria-label="Configurações">
          <Settings size={19} />
        </button>
        {isAuthenticated ? (
          <div className="auth-chip">
            <span>{userEmail ?? 'Sessão ativa'}</span>
            <button type="button" onClick={logout}>
              Sair
            </button>
          </div>
        ) : (
          <NavLink className="auth-link" to="/login">
            Entrar
          </NavLink>
        )}
        <div className="user-chip">
          <BadgeIcon size={19} />
          <span>
            {userContext.name}
            <small>{userContext.role}</small>
          </span>
        </div>
        <button
          className="menu-button"
          type="button"
          aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isMenuOpen ? renderNav('mobile-nav') : null}
    </header>
  );
}

export default App;
