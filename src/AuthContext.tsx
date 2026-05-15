import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { buildApiUrl } from './services/apiClient';
import { clearAuth, persistAuth, readAuthEmail, readAuthToken } from './services/authStorage';

type AuthContextValue = {
  isAuthenticated: boolean;
  userEmail: string | null;
  isBusy: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
  const [isBusy, setIsBusy] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsBusy(true);
    try {
      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const message = (await readErrorMessage(response)) ?? 'Falha ao autenticar.';
        throw new Error(message);
      }

      const payload = (await response.json()) as { token?: string; user?: { email?: string } };
      if (!payload?.token) {
        throw new Error('Resposta invalida do servidor.');
      }

      const resolvedEmail = payload.user?.email ?? email;
      persistAuth(payload.token, resolvedEmail);
      setToken(payload.token);
      setUserEmail(resolvedEmail);
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
          body: JSON.stringify({ email, password }),
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
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      userEmail,
      isBusy,
      login,
      register,
      logout,
    }),
    [isBusy, login, logout, register, token, userEmail],
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
