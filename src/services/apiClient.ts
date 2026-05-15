import { readAuthToken } from './authStorage';

const resolveApiBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_BASE_URL;
  if (!rawUrl) {
    return '';
  }

  const trimmed = rawUrl.trim();
  return trimmed.length > 0 ? trimmed.replace(/\/$/, '') : '';
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = resolveApiBaseUrl();
  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = readAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchJson = async (path: string, init: RequestInit = {}) => {
  const url = buildApiUrl(path);
  const existing = (init.headers as Record<string, string>) || {};
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...existing,
  };

  if (!headers.Authorization) {
    const token = readAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const err: any = new Error(`Request failed with status ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
};
