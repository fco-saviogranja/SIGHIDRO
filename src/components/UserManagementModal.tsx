import { useState } from 'react';
import { Plus, Trash2, Edit2, ChevronDown } from 'lucide-react';
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

export type UserData = {
  id: string;
  email: string;
  role: AuthRole;
  name: string;
  createdAt: string;
};

type FormMode = 'add' | 'edit' | null;

type FormState = {
  id?: string;
  email: string;
  name: string;
  role: AuthRole;
};

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
  const [users, setUsers] = useState<UserData[]>([
    {
      id: '1',
      email: 'admin@sighidro.gov.br',
      role: 'administrador',
      name: 'Admin SIGHIDRO',
      createdAt: new Date().toISOString(),
    },
  ]);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const canManageUsers = userRole === 'administrador' || userRole === 'gestor';

  const validateForm = (): boolean => {
    const newErrors: Partial<FormState> = {};

    if (!formState.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formState.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddClick = () => {
    setFormState(INITIAL_FORM_STATE);
    setErrors({});
    setFormMode('add');
  };

  const handleEditClick = (user: UserData) => {
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

    if (formMode === 'add') {
      const newUser: UserData = {
        id: String(Date.now()),
        email: formState.email,
        name: formState.name,
        role: formState.role,
        createdAt: new Date().toISOString(),
      };
      setUsers([...users, newUser]);
    } else if (formMode === 'edit' && formState.id) {
      setUsers(
        users.map((user) =>
          user.id === formState.id
            ? {
                ...user,
                email: formState.email,
                name: formState.name,
                role: formState.role,
              }
            : user
        )
      );
    }

    setFormMode(null);
    setFormState(INITIAL_FORM_STATE);
  };

  const handleDelete = (userId: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      setUsers(users.filter((user) => user.id !== userId));
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
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
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

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{user.name}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {user.email}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {ROLE_LABELS[user.role]}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditClick(user)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label="Editar usuário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(user.id)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
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
          <div className="space-y-4">
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
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                  placeholder="Digite o nome"
                  className="mt-1"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
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
                  value={formState.email}
                  onChange={(e) =>
                    setFormState({ ...formState, email: e.target.value })
                  }
                  placeholder="usuario@sighidro.gov.br"
                  className="mt-1"
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
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
                  <SelectTrigger id="user-role" className="mt-1">
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
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {ROLE_DESCRIPTIONS[formState.role]}
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-white/10">
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} variant="default" size="sm">
                {formMode === 'add' ? 'Cadastrar' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
