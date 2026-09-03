import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useCreateCategory, useUpdateCategory } from "@/hooks/useCategories";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";
import type { Category } from "@/types/category";

export function CategoryFormModal({ open, onClose, category }: { open: boolean; onClose: () => void; category?: Category | null }) {
  const isEdit = Boolean(category);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setActive(category?.active ?? true);
    setError(null);
  }, [open, category]);

  const submitting = createCategory.isPending || updateCategory.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          input: { name: name.trim(), description: description.trim() || null, active },
        });
        showToast("Categoría actualizada correctamente.");
      } else {
        await createCategory.mutateAsync({ name: name.trim(), description: description.trim() || null });
        showToast("Categoría creada correctamente.");
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar categoría" : "Nueva categoría"} size="sm">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input id="categoryName" label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Periféricos" />
        <Textarea id="categoryDescription" label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-800 focus:ring-primary-800"
            />
            Categoría activa
          </label>
        )}
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Guardar cambios" : "Crear categoría"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
