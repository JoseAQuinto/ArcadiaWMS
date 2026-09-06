import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import type { ManagedUser } from "@/types/user";
import type { UserRole } from "@/types/auth";

const PASSWORD_HINT = "Mínimo 8 caracteres, con al menos una letra y un número.";

export function UserFormModal({ open, onClose, user }: { open: boolean; onClose: () => void; user?: ManagedUser | null }) {
  const isEdit = Boolean(user);
  const { user: currentUser } = useAuth();
  const isSelf = Boolean(user && currentUser && user.id === currentUser.id);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("OPERATOR");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
    setFullName(user?.fullName ?? "");
    setRole(user?.role ?? "OPERATOR");
    setActive(user?.active ?? true);
    setPassword("");
    setError(null);
  }, [open, user]);

  const submitting = createUser.isPending || updateUser.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({
          id: user.id,
          input: {
            email: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            role,
            active,
            // An empty field means "leave the password as it is", never "clear it".
            ...(password ? { password } : {}),
          },
        });
        showToast("Usuario actualizado correctamente.");
      } else {
        await createUser.mutateAsync({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          role,
          password,
        });
        showToast("Usuario creado correctamente.");
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar usuario" : "Nuevo usuario"} size="sm">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          id="userFullName"
          label="Nombre completo"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Laura Gómez"
        />
        <Input
          id="userUsername"
          label="Usuario"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="lgomez"
          disabled={isEdit}
          hint={isEdit ? "El usuario no se puede cambiar una vez creado." : "Solo letras, números, puntos y guiones."}
        />
        <Input
          id="userEmail"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="lgomez@arcadiawms.com"
        />
        <Select
          id="userRole"
          label="Rol"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={isSelf}
          hint={isSelf ? "No puedes cambiar tu propio rol." : undefined}
        >
          <option value="OPERATOR">Operario</option>
          <option value="ADMIN">Administrador</option>
        </Select>
        <Input
          id="userPassword"
          label={isEdit ? "Nueva contraseña" : "Contraseña"}
          type="password"
          required={!isEdit}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          hint={isEdit ? `Déjalo vacío para no cambiarla. ${PASSWORD_HINT}` : PASSWORD_HINT}
        />
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={isSelf}
              className="h-4 w-4 rounded border-slate-300 text-primary-800 focus:ring-primary-800 disabled:opacity-50"
            />
            Usuario activo
            {isSelf && <span className="text-xs text-slate-400">(no puedes desactivarte a ti mismo)</span>}
          </label>
        )}
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
