const AUTH_TOKEN_KEY = 'sighidro:auth:token';
const AUTH_EMAIL_KEY = 'sighidro:auth:email';
const AUTH_ROLE_KEY = 'sighidro:auth:role';

export type AuthRole = 'admin' | 'operator';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

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

  const role = window.localStorage.getItem(AUTH_ROLE_KEY);
  return role === 'admin' || role === 'operator' ? role : null;
};

export const persistAuth = (token: string, email?: string, role: AuthRole = 'operator') => {
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
