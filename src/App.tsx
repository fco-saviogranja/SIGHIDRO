import { useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Bell, Droplets, Menu, Settings } from 'lucide-react';
import CadastroHidrico from './pages/CadastroHidrico';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/Login';
import ModulePage from './pages/ModulePage';
import { useAuth } from './AuthContext';
import { HydroRegistryProvider } from './HydroRegistryContext';
import { navItems, userContext } from './metadata';

import { Avatar, AvatarFallback } from './components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { Button } from './components/ui/button';

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
      <Route index element={<LandingPage />} />
      <Route path="login" element={<LoginPage />} />
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
    <div className="app-shell">
      <Header />
      <Outlet />
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
                  ? "bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200/50" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-14 max-w-screen-2xl items-center gap-6 px-4 md:px-8">
        <NavLink className="flex items-center gap-2 mr-4" to="/dashboard" aria-label="Ir para o dashboard">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm ring-1 ring-slate-950/20">
            <Droplets className="w-5 h-5" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-bold leading-none tracking-tight text-slate-900">SIGHIDRO</span>
            <span className="text-[10px] uppercase font-semibold leading-none tracking-wider text-slate-500">ERP Hídrico</span>
          </div>
        </NavLink>

        <div className="hidden lg:flex" >
          {renderNav('flex items-center gap-1')}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          
          <Button variant="ghost" size="icon" className="text-slate-600">
             <Bell className="w-4 h-4" />
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}>
                  <Avatar className="h-8 w-8 border border-slate-200 shadow-sm">
                    <AvatarFallback className="bg-slate-50 text-slate-900 font-semibold">{displayName.substring(0,2).toUpperCase()}</AvatarFallback>
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
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
                <Menu className="w-5 h-5" />
                <span className="sr-only">Toggle Menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm ring-1 ring-slate-950/20">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold leading-none">SIGHIDRO</span>
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
