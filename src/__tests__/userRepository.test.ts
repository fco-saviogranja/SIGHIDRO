import { beforeEach, describe, expect, it } from 'vitest';
import {
  createSystemUser,
  loadSystemUsers,
  saveSystemUsers,
} from '../services/userRepository';

describe('userRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads the default admin user into localStorage', () => {
    const users = loadSystemUsers();

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('admin@sighidro.gov.br');
    expect(window.localStorage.getItem('sighidro:users:v1')).toBeTruthy();
  });

  it('persists user updates across reads', () => {
    const [admin] = loadSystemUsers();
    saveSystemUsers([{ ...admin, name: 'Administrador Geral' }]);

    expect(loadSystemUsers()[0].name).toBe('Administrador Geral');
  });

  it('normalizes and persists newly created users', () => {
    const user = createSystemUser({
      email: ' Gestor@SIGHIDRO.gov.br ',
      name: 'Gestor Operacional',
      role: 'gestor',
    });

    saveSystemUsers([user]);

    expect(loadSystemUsers()[0]).toMatchObject({
      email: 'gestor@sighidro.gov.br',
      name: 'Gestor Operacional',
      role: 'gestor',
    });
  });
});
