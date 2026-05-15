import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { buildApiUrl } from './services/apiClient';
import {
  clearAuth,
  persistAuth,
  readAuthEmail,
  readAuthRole,
  readAuthToken,
  type AuthRole,
} from './services/authStorage';

type AuthContextValue = {
  isAuthenticated: boolean;
  userEmail: string | null;
  userRole: AuthRole | null;
  isBusy: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const devAdminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@sighidro.gov.br';
const devAdminPassword = import.meta.env.VITE_ADMIN_PASSWORD || (import.meta.env.DEV ? 'Admin@2026' : '');
const isApiBackendEnabled = import.meta.env.VITE_SIGHIDRO_BACKEND === 'api';

const canUseDevAdminFallback = (email: string, password: string) =>
  import.meta.env.DEV && email.trim().toLowerCase() === devAdminEmail && password === devAdminPassword;

const persistDevAdminSession = (email: string) => {
  const fallbackToken = `dev-admin-${Date.now()}`;
  persistAuth(fallbackToken, email, 'admin');
  return fallbackToken;
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload?.error) {
      return payload.error;
    }
  } catch {
    return null;
  }

  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readAuthToken());
  const [userEmail, setUserEmail] = useState<string | null>(() => readAuthEmail());
  const [userRole, setUserRole] = useState<AuthRole | null>(() => readAuthRole());
  const [isBusy, setIsBusy] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    setIsBusy(true);
    try {
      if (!isApiBackendEnabled && canUseDevAdminFallback(normalizedEmail, password)) {
        const fallbackToken = persistDevAdminSession(normalizedEmail);
        setToken(fallbackToken);
        setUserEmail(normalizedEmail);
        setUserRole('admin');
        return;
      }

      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (!response.ok) {
        const message = (await readErrorMessage(response)) ?? 'Falha ao autenticar.';
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        token?: string;
        user?: { email?: string; role?: AuthRole };
      };
      if (!payload?.token) {
        throw new Error('Resposta invalida do servidor.');
      }

      const resolvedEmail = payload.user?.email ?? normalizedEmail;
      const resolvedRole = payload.user?.role === 'admin' ? 'admin' : 'operator';
      persistAuth(payload.token, resolvedEmail, resolvedRole);
      setToken(payload.token);
      setUserEmail(resolvedEmail);
      setUserRole(resolvedRole);
    } catch (error) {
      if (canUseDevAdminFallback(normalizedEmail, password)) {
        const fallbackToken = persistDevAdminSession(normalizedEmail);
        setToken(fallbackToken);
        setUserEmail(normalizedEmail);
        setUserRole('admin');
        return;
      }

      throw error;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      setIsBusy(true);
      try {
        const response = await fetch(buildApiUrl('/api/auth/register'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });

        if (!response.ok) {
          const message = (await readErrorMessage(response)) ?? 'Falha ao criar conta.';
          throw new Error(message);
        }

        await login(email, password);
      } finally {
        setIsBusy(false);
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUserEmail(null);
    setUserRole(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      userEmail,
      userRole,
      isBusy,
      login,
      register,
      logout,
    }),
    [isBusy, login, logout, register, token, userEmail, userRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
