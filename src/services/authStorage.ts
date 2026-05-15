const AUTH_TOKEN_KEY = 'sighidro:auth:token';
const AUTH_EMAIL_KEY = 'sighidro:auth:email';

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

export const persistAuth = (token: string, email?: string) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (email) {
    window.localStorage.setItem(AUTH_EMAIL_KEY, email);
  }
};

export const clearAuth = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_EMAIL_KEY);
};
