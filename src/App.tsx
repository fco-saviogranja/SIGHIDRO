import { useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Bell, Droplets, Menu, Settings, X } from 'lucide-react';
import CadastroHidrico from './pages/CadastroHidrico';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/Login';
import ModulePage from './pages/ModulePage';
import { useAuth } from './AuthContext';
import { HydroRegistryProvider } from './HydroRegistryContext';
import { navItems, userContext } from './metadata';

function RequireAuth() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={(
          <HydroRegistryProvider>
            <AppShell />
          </HydroRegistryProvider>
        )}>
          <Route index element={<Dashboard />} />
          <Route path="cadastro" element={<CadastroHidrico />} />
          <Route path="monitoramento" element={<ModulePage variant="monitoramento" />} />
          <Route path="manutencao" element={<ModulePage variant="manutencao" />} />
          <Route path="mapa" element={<ModulePage variant="mapa" />} />
          <Route path="relatorios" element={<ModulePage variant="relatorios" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-body">
        <Header />
        <Outlet />
      </div>
    </div>
  );
}

function Sidebar() {
  const BadgeIcon = userContext.badgeIcon;

  return (
    <aside className="sidebar">
      <NavLink className="brand-lockup sidebar-brand" to="/" aria-label="Ir para o dashboard">
        <div className="brand-mark" aria-hidden="true">
          <Droplets size={26} />
        </div>
        <div>
          <strong>SIGHIDRO</strong>
          <span>Plataforma operacional do SAAE de Jardim</span>
        </div>
      </NavLink>

      <div className="sidebar-section">
        <span className="sidebar-label">Navegação</span>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink end={item.path === '/'} key={item.path} to={item.path}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-label">Perfil</span>
        <div className="sidebar-profile">
          <BadgeIcon size={18} />
          <div>
            <strong>{userContext.name}</strong>
            <small>{userContext.role}</small>
          </div>
        </div>
      </div>
    </aside>
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
      <div className="topbar-title">
        <div className="topbar-brand" aria-hidden="true">
          <div className="brand-mark">
            <Droplets size={22} />
          </div>
          <span>SIGHIDRO</span>
        </div>
        <span className="eyebrow">Centro operacional</span>
        <strong>Visão consolidada de ativos e desempenho</strong>
      </div>

      <div className="topbar-filters" aria-label="Filtros rápidos">
        <label className="search-field">
          <span>Buscar</span>
          <input aria-label="Buscar ativos" placeholder="Buscar poço, bomba ou localidade" />
        </label>
        <label className="filter-field">
          <span>Período</span>
          <select aria-label="Selecionar período">
            <option>Hoje</option>
            <option>Últimos 7 dias</option>
            <option>Últimos 30 dias</option>
          </select>
        </label>
      </div>

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
