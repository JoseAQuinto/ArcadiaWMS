import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useChangePassword } from "@/hooks/useUsers";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";

/** Available to every role from the header menu: an operator must be able to rotate their own password without an admin. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const changePassword = useChangePassword();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setRepeatPassword("");
    setError(null);
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== repeatPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      showToast("Contraseña actualizada correctamente.");
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cambiar contraseña" size="sm">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          id="currentPassword"
          label="Contraseña actual"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          id="newPassword"
          label="Nueva contraseña"
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          hint="Mínimo 8 caracteres, con al menos una letra y un número."
        />
        <Input
          id="repeatPassword"
          label="Repite la nueva contraseña"
          type="password"
          required
          autoComplete="new-password"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
        />
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={changePassword.isPending}>
            Guardar contraseña
          </Button>
        </div>
      </form>
    </Modal>
  );
}
