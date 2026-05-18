import { normalizeAuthRole, type AuthRole } from './authStorage';

export type SystemUser = {
  id: string;
  email: string;
  role: AuthRole;
  name: string;
  createdAt: string;
  updatedAt: string;
};

const USERS_STORAGE_KEY = 'sighidro:users:v1';
const USERS_CHANGED_EVENT = 'sighidro:users:changed';
const DEFAULT_USER_TIMESTAMP = '2026-05-14T12:00:00.000Z';

const defaultUsers: SystemUser[] = [
  {
    id: 'admin-sighidro',
    email: 'admin@sighidro.gov.br',
    role: 'administrador',
    name: 'Admin SIGHIDRO',
    createdAt: DEFAULT_USER_TIMESTAMP,
    updatedAt: DEFAULT_USER_TIMESTAMP,
  },
];

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const makeUserId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const cloneDefaultUsers = () => defaultUsers.map((user) => ({ ...user }));

const normalizeEmail = (email: unknown) => String(email ?? '').trim().toLowerCase();

const normalizeUser = (value: unknown): SystemUser | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const user = value as Partial<SystemUser>;
  const email = normalizeEmail(user.email);
  const role = normalizeAuthRole(user.role);
  const name = String(user.name ?? '').trim();

  if (!email || !role || !name) {
    return null;
  }

  const createdAt = user.createdAt || new Date().toISOString();

  return {
    createdAt,
    email,
    id: String(user.id || makeUserId()),
    name,
    role,
    updatedAt: user.updatedAt || createdAt,
  };
};

const normalizeUsers = (payload: unknown): SystemUser[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(normalizeUser).filter((user): user is SystemUser => Boolean(user));
};

const emitUsersChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(USERS_CHANGED_EVENT));
  }
};

export const loadSystemUsers = () => {
  if (!canUseStorage()) {
    return cloneDefaultUsers();
  }

  const stored = window.localStorage.getItem(USERS_STORAGE_KEY);
  if (!stored) {
    const users = cloneDefaultUsers();
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return users;
  }

  try {
    return normalizeUsers(JSON.parse(stored));
  } catch {
    return cloneDefaultUsers();
  }
};

export const saveSystemUsers = (users: SystemUser[]) => {
  const normalizedUsers = normalizeUsers(users);

  if (canUseStorage()) {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalizedUsers));
    emitUsersChanged();
  }

  return normalizedUsers;
};

export const createSystemUser = (draft: Pick<SystemUser, 'email' | 'name' | 'role'>): SystemUser => {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    email: normalizeEmail(draft.email),
    id: makeUserId(),
    name: draft.name.trim(),
    role: draft.role,
    updatedAt: now,
  };
};

export const subscribeSystemUsers = (listener: (users: SystemUser[]) => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleUsersChanged = () => listener(loadSystemUsers());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === USERS_STORAGE_KEY) {
      handleUsersChanged();
    }
  };

  window.addEventListener(USERS_CHANGED_EVENT, handleUsersChanged);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(USERS_CHANGED_EVENT, handleUsersChanged);
    window.removeEventListener('storage', handleStorage);
  };
};

export const findSystemUserByEmail = (email: string | null) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  return loadSystemUsers().find((user) => user.email === normalizedEmail) ?? null;
};
