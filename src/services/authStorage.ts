const AUTH_TOKEN_KEY = 'sighidro:auth:token';
const AUTH_EMAIL_KEY = 'sighidro:auth:email';
const AUTH_ROLE_KEY = 'sighidro:auth:role';

export type AuthRole = 'administrador' | 'gestor' | 'técnico';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const normalizeAuthRole = (role?: string | null) => {
  const value = String(role ?? '').trim().toLowerCase();
  if (value === 'administrador' || value === 'admin') return 'administrador' as const;
  if (value === 'gestor') return 'gestor' as const;
  if (value === 'técnico' || value === 'tecnico' || value === 'operator' || value === 'operador') return 'técnico' as const;
  return null;
};

export const readAuthToken = () => {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const readAuthEmail = () => {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_EMAIL_KEY);
};

export const readAuthRole = (): AuthRole | null => {
  if (!canUseStorage()) {
    return null;
  }

  return normalizeAuthRole(window.localStorage.getItem(AUTH_ROLE_KEY));
};

export const persistAuth = (token: string, email?: string, role: AuthRole = 'técnico') => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (email) {
    window.localStorage.setItem(AUTH_EMAIL_KEY, email);
  }
  window.localStorage.setItem(AUTH_ROLE_KEY, role);
};

export const clearAuth = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_EMAIL_KEY);
  window.localStorage.removeItem(AUTH_ROLE_KEY);
};
