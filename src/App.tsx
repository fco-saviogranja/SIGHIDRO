import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Bell, Droplets, Menu, Moon, Settings, Sun } from 'lucide-react';
import { useAuth } from './AuthContext';
import { HydroRegistryProvider } from './HydroRegistryContext';
import { useTheme } from './ThemeContext';
import { navItems, userContext } from './metadata';

import { Avatar, AvatarFallback } from './components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { Button } from './components/ui/button';

const CadastroHidrico = lazy(() => import('./pages/CadastroHidrico'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/Login'));
const Manutencao = lazy(() => import('./pages/Manutencao'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const Monitoramento = lazy(() => import('./pages/Monitoramento'));

function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

function RouteLoading() {
  return (
    <div className="route-loading" role="status">
      <span />
      Carregando módulo
    </div>
  );
}

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
      <Route index element={<PageSuspense><LandingPage /></PageSuspense>} />
      <Route path="login" element={<PageSuspense><LoginPage /></PageSuspense>} />
      <Route element={<RequireAuth />}>
        <Route element={(
          <HydroRegistryProvider>
            <AppShell />
          </HydroRegistryProvider>
        )}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="cadastro" element={<CadastroHidrico />} />
          <Route path="monitoramento" element={<Monitoramento />} />
          <Route path="manutencao" element={<Manutencao />} />
          <Route path="mapa" element={<ModulePage variant="mapa" />} />
          <Route path="relatorios" element={<ModulePage variant="relatorios" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const { theme } = useTheme();

  return (
    <div className={`app-shell ${theme}`}>
      <Header />
      <PageSuspense>
        <Outlet />
      </PageSuspense>
    </div>
  );
}

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, userEmail, userRole, logout } = useAuth();
  const { isDark, theme, toggleTheme } = useTheme();
  const roleLabel = userRole === 'admin' ? 'Administrador' : userContext.role;
  const displayName = userRole === 'admin' ? 'Admin SIGHIDRO' : userContext.name;
  const ThemeIcon = isDark ? Sun : Moon;
  const iconButtonClass = isDark
    ? 'text-slate-300 hover:bg-white/10 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950';
  const brandTextClass = isDark ? 'text-slate-50' : 'text-slate-950';
  const brandSubtextClass = isDark ? 'text-cyan-100/70' : 'text-cyan-800/70';
  const shellPanelClass = isDark
    ? 'border-white/10 bg-[#07111f] text-slate-100'
    : 'border-slate-200 bg-white text-slate-950';

  const renderNav = (className: string) => (
    <nav className={className} aria-label="Navegação principal">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            end={item.path === '/dashboard'}
            key={item.path}
            to={item.path}
            onClick={() => setIsMenuOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive
                  ? isDark
                    ? 'bg-white/10 text-cyan-100 shadow-sm ring-1 ring-white/10'
                    : 'bg-cyan-50 text-cyan-950 shadow-sm ring-1 ring-cyan-100'
                  : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-white/8'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b backdrop-blur transition-colors ${
        isDark
          ? 'border-white/10 bg-[#07111f]/80 supports-[backdrop-filter]:bg-[#07111f]/70'
          : 'border-slate-200/80 bg-white/90 shadow-sm supports-[backdrop-filter]:bg-white/80'
      }`}
    >
      <div className="container flex h-16 max-w-screen-2xl items-center gap-7 px-4 md:px-8">
        <NavLink className="flex min-w-[150px] items-center gap-3 mr-3" to="/dashboard" aria-label="Ir para o dashboard">
          <div className="app-brand-mark">
            <Droplets className="w-5 h-5" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className={`text-base font-bold leading-none tracking-tight ${brandTextClass}`}>SIGHIDRO</span>
            <span className={`mt-1 text-[11px] uppercase font-semibold leading-none tracking-normal ${brandSubtextClass}`}>ERP Hídrico</span>
          </div>
        </NavLink>

        <div className="hidden lg:flex" >
          {renderNav('flex items-center gap-1')}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          
          <Button variant="ghost" size="icon" className={iconButtonClass}>
             <Bell className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={iconButtonClass}
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-pressed={isDark}
            title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
             <ThemeIcon className="w-4 h-4" />
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className={`relative h-8 w-8 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`} />}>
                  <Avatar className={`h-8 w-8 border shadow-sm ${isDark ? 'border-white/15' : 'border-slate-200'}`}>
                    <AvatarFallback className={`${isDark ? 'bg-white/10 text-slate-50' : 'bg-cyan-50 text-cyan-950'} font-semibold`}>{displayName.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{roleLabel}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className={isDark ? 'text-red-300 focus:bg-red-950/45 focus:text-red-200' : 'text-red-600 focus:bg-red-50 focus:text-red-700'}
                >
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button nativeButton={false} render={<NavLink to="/login" />} variant="default" size="sm">
              Entrar
            </Button>
          )}

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className={`lg:hidden ${iconButtonClass}`} />}>
                <Menu className="w-5 h-5" />
                <span className="sr-only">Abrir menu</span>
            </SheetTrigger>
            <SheetContent side="right" className={`w-[300px] sm:w-[400px] ${shellPanelClass}`}>
              <div className="flex flex-col gap-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="app-brand-mark">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`block text-base font-bold leading-none ${brandTextClass}`}>SIGHIDRO</span>
                    <span className={`mt-1 block text-[11px] uppercase font-semibold leading-none ${brandSubtextClass}`}>ERP Hídrico</span>
                  </div>
                </div>
                {renderNav('flex flex-col gap-2')}
                <Button
                  variant="outline"
                  type="button"
                  className={isDark ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'}
                  onClick={toggleTheme}
                  aria-pressed={isDark}
                >
                  <ThemeIcon className="mr-2 h-4 w-4" />
                  {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>
    </header>
  );
}

export default App;
