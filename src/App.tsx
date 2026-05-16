import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Bell, Droplets, Menu, Settings } from 'lucide-react';
import { useAuth } from './AuthContext';
import { HydroRegistryProvider } from './HydroRegistryContext';
import { navItems, userContext } from './metadata';

import { Avatar, AvatarFallback } from './components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { Button } from './components/ui/button';

const CadastroHidrico = lazy(() => import('./pages/CadastroHidrico'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/Login'));
const ModulePage = lazy(() => import('./pages/ModulePage'));

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
    <div className="app-shell dark">
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
  const roleLabel = userRole === 'admin' ? 'Administrador' : userContext.role;
  const displayName = userRole === 'admin' ? 'Admin SIGHIDRO' : userContext.name;

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
                  ? "bg-white/10 text-cyan-100 shadow-sm ring-1 ring-white/10" 
                  : "text-slate-300 hover:text-white hover:bg-white/8"
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
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#07111f]/82 backdrop-blur supports-[backdrop-filter]:bg-[#07111f]/68">
      <div className="container flex h-16 max-w-screen-2xl items-center gap-7 px-4 md:px-8">
        <NavLink className="flex min-w-[150px] items-center gap-3 mr-3" to="/dashboard" aria-label="Ir para o dashboard">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-slate-950 shadow-sm ring-1 ring-white/20">
            <Droplets className="w-5 h-5" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-base font-bold leading-none tracking-tight text-slate-50">SIGHIDRO</span>
            <span className="mt-1 text-[11px] uppercase font-semibold leading-none tracking-normal text-cyan-100/70">ERP Hídrico</span>
          </div>
        </NavLink>

        <div className="hidden lg:flex" >
          {renderNav('flex items-center gap-1')}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          
          <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white">
             <Bell className="w-4 h-4" />
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/10" />}>
                  <Avatar className="h-8 w-8 border border-white/15 shadow-sm">
                    <AvatarFallback className="bg-white/10 text-slate-50 font-semibold">{displayName.substring(0,2).toUpperCase()}</AvatarFallback>
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
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:bg-red-50 focus:text-red-700">
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
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden text-slate-300 hover:bg-white/10 hover:text-white" />}>
                <Menu className="w-5 h-5" />
                <span className="sr-only">Toggle Menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] border-white/10 bg-[#07111f] text-slate-100">
              <div className="flex flex-col gap-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-sm ring-1 ring-white/20">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-base font-bold leading-none">SIGHIDRO</span>
                    <span className="mt-1 block text-[11px] uppercase font-semibold leading-none text-cyan-100/70">ERP Hídrico</span>
                  </div>
                </div>
                {renderNav('flex flex-col gap-2')}
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>
    </header>
  );
}

export default App;
