import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { AuthRole } from '../services/authStorage';
import {
  createSystemUser,
  loadSystemUsers,
  saveSystemUsers,
  type SystemUser,
} from '../services/userRepository';

type FormMode = 'add' | 'edit' | null;

type FormState = {
  id?: string;
  email: string;
  name: string;
  role: AuthRole;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM_STATE: FormState = {
  email: '',
  name: '',
  role: 'técnico',
};

const ROLE_LABELS: Record<AuthRole, string> = {
  administrador: 'Administrador',
  gestor: 'Gestor',
  técnico: 'Técnico',
};

const ROLE_DESCRIPTIONS: Record<AuthRole, string> = {
  administrador: 'Acesso total ao sistema e gerenciamento de usuários',
  gestor: 'Pode visualizar, editar e cadastrar usuários',
  técnico: 'Acesso limitado às funcionalidades operacionais',
};

type UserManagementModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: AuthRole | null;
};

export function UserManagementModal({
  open,
  onOpenChange,
  userRole,
}: UserManagementModalProps) {
  const [users, setUsers] = useState<SystemUser[]>(() => loadSystemUsers());

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});

  const canManageUsers = userRole === 'administrador' || userRole === 'gestor';

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const normalizedEmail = formState.email.trim().toLowerCase();

    if (!normalizedEmail) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      newErrors.email = 'Email inválido';
    } else if (users.some((user) => user.email === normalizedEmail && user.id !== formState.id)) {
      newErrors.email = 'Já existe um usuário com este email';
    }

    if (!formState.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const persistUsers = (nextUsers: SystemUser[]) => {
    setUsers(saveSystemUsers(nextUsers));
  };

  const handleAddClick = () => {
    setFormState(INITIAL_FORM_STATE);
    setErrors({});
    setFormMode('add');
  };

  const handleEditClick = (user: SystemUser) => {
    setFormState({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    setErrors({});
    setFormMode('edit');
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const normalizedEmail = formState.email.trim().toLowerCase();
    const trimmedName = formState.name.trim();

    if (formMode === 'add') {
      const newUser = createSystemUser({
        email: normalizedEmail,
        name: trimmedName,
        role: formState.role,
      });
      persistUsers([...users, newUser]);
    } else if (formMode === 'edit' && formState.id) {
      const currentUser = users.find((user) => user.id === formState.id);
      const isLastAdmin =
        currentUser?.role === 'administrador' &&
        formState.role !== 'administrador' &&
        users.filter((user) => user.role === 'administrador').length === 1;

      if (isLastAdmin) {
        setErrors({ role: 'Mantenha pelo menos um administrador cadastrado' });
        return;
      }

      persistUsers(
        users.map((user) =>
          user.id === formState.id
            ? {
                ...user,
                email: normalizedEmail,
                name: trimmedName,
                role: formState.role,
                updatedAt: new Date().toISOString(),
              }
            : user
        )
      );
    }

    setFormMode(null);
    setFormState(INITIAL_FORM_STATE);
  };

  const handleDelete = (userId: string) => {
    const user = users.find((item) => item.id === userId);
    if (user?.role === 'administrador' && users.filter((item) => item.role === 'administrador').length === 1) {
      alert('Mantenha pelo menos um administrador cadastrado.');
      return;
    }

    if (confirm('Tem certeza que deseja remover este usuário?')) {
      persistUsers(users.filter((user) => user.id !== userId));
    }
  };

  const handleCancel = () => {
    setFormMode(null);
    setFormState(INITIAL_FORM_STATE);
    setErrors({});
  };

  if (!canManageUsers) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sighidro-dialog">
          <DialogHeader>
            <DialogTitle>Acesso Negado</DialogTitle>
            <DialogDescription>
              Apenas Administradores e Gestores podem gerenciar usuários.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sighidro-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciamento de Usuários</DialogTitle>
          <DialogDescription>
            Visualize, edite e cadastre novos usuários do sistema.
          </DialogDescription>
        </DialogHeader>

        {formMode === null ? (
          <div className="space-y-4">
            <div className="user-management-toolbar flex justify-between items-center gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-medium text-sm">Usuários Cadastrados</h3>
              <Button
                onClick={handleAddClick}
                size="sm"
                variant="default"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Usuário
              </Button>
            </div>

            <div className="user-management-list space-y-2 max-h-[400px] overflow-y-auto">
              {!users.length ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600 dark:border-white/15 dark:text-slate-400" role="status">
                  Nenhum usuário cadastrado.
                </p>
              ) : null}
              {users.map((user) => (
                <div
                  key={user.id}
                  className="user-management-card flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="user-management-details min-w-0 flex-1">
                    <div className="font-medium text-sm">{user.name}</div>
                    <div className="break-all text-xs text-slate-600 dark:text-slate-400">
                      {user.email}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {ROLE_LABELS[user.role]}
                    </div>
                  </div>
                  <div className="user-management-actions flex gap-2">
                    <Button
                      onClick={() => handleEditClick(user)}
                      size="sm"
                      variant="ghost"
                      className="h-11 w-11 p-0"
                      aria-label="Editar usuário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(user.id)}
                      size="sm"
                      variant="ghost"
                      className="h-11 w-11 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Deletar usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form
            className="user-management-form space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <h3 className="font-medium text-sm">
              {formMode === 'add' ? 'Novo Usuário' : 'Editar Usuário'}
            </h3>

            <div className="space-y-3">
              <div>
                <Label htmlFor="user-name" className="text-xs font-medium">
                  Nome Completo
                </Label>
                <Input
                  id="user-name"
                  autoComplete="name"
                  autoFocus
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                  placeholder="Digite o nome"
                  className="mt-1"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'user-name-error' : undefined}
                />
                {errors.name && (
                  <p id="user-name-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="user-email" className="text-xs font-medium">
                  Email
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  autoComplete="email"
                  value={formState.email}
                  onChange={(e) =>
                    setFormState({ ...formState, email: e.target.value })
                  }
                  placeholder="usuario@sighidro.gov.br"
                  className="mt-1"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'user-email-error' : undefined}
                />
                {errors.email && (
                  <p id="user-email-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="user-role" className="text-xs font-medium">
                  Função
                </Label>
                <Select
                  value={formState.role}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      role: value as AuthRole,
                    })
                  }
                >
                  <SelectTrigger
                    id="user-role"
                    className="mt-1 min-h-11 w-full"
                    aria-invalid={!!errors.role}
                    aria-describedby={errors.role ? 'user-role-error user-role-description' : 'user-role-description'}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="técnico">
                      <span className="flex items-center gap-2">
                        Técnico
                      </span>
                    </SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    {userRole === 'administrador' && (
                      <SelectItem value="administrador">Administrador</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p id="user-role-description" className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {ROLE_DESCRIPTIONS[formState.role]}
                </p>
                {errors.role && (
                  <p id="user-role-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    {errors.role}
                  </p>
                )}
              </div>
            </div>

            <div className="user-management-form-actions flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-white/10">
              <Button
                onClick={handleCancel}
                type="button"
                variant="outline"
                size="sm"
              >
                Cancelar
              </Button>
              <Button type="submit" variant="default" size="sm">
                {formMode === 'add' ? 'Cadastrar' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
