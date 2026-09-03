import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useCategories } from "@/hooks/useCategories";
import { useCreateItem, useUpdateItem } from "@/hooks/useItems";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";
import type { Item } from "@/types/item";

interface ItemFormModalProps {
  open: boolean;
  onClose: () => void;
  item?: Item | null;
}

export function ItemFormModal({ open, onClose, item }: ItemFormModalProps) {
  const isEdit = Boolean(item);
  const { data: categories } = useCategories();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const { showToast } = useToast();

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("UD");
  const [minimumStock, setMinimumStock] = useState("0");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSku(item?.sku ?? "");
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setCategoryId(item?.categoryId ? String(item.categoryId) : "");
    setUnit(item?.unit ?? "UD");
    setMinimumStock(item ? String(item.minimumStock) : "0");
    setActive(item?.active ?? true);
    setError(null);
  }, [open, item]);

  const submitting = createItem.isPending || updateItem.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const input = {
      sku: sku.trim(),
      name: name.trim(),
      description: description.trim() || null,
      categoryId: categoryId ? Number(categoryId) : null,
      unit: unit.trim() || "UD",
      minimumStock: Number(minimumStock) || 0,
    };

    try {
      if (isEdit && item) {
        await updateItem.mutateAsync({ id: item.id, input: { ...input, active } });
        showToast("Artículo actualizado correctamente.");
      } else {
        await createItem.mutateAsync(input);
        showToast("Artículo creado correctamente.");
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar artículo" : "Nuevo artículo"} size="md">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="sku" label="SKU" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="MON-24-FHD" />
          <Select id="unit" label="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="UD">Unidad (UD)</option>
            <option value="CAJA">Caja</option>
            <option value="PACK">Pack</option>
            <option value="KG">Kilogramo</option>
            <option value="M">Metro</option>
          </Select>
        </div>
        <Input
          id="name"
          label="Nombre"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Monitor 24'' Full HD"
        />
        <Textarea id="description" label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select id="categoryId" label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Input
            id="minimumStock"
            label="Stock mínimo"
            type="number"
            min={0}
            value={minimumStock}
            onChange={(e) => setMinimumStock(e.target.value)}
          />
        </div>
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-800 focus:ring-primary-800"
            />
            Artículo activo
          </label>
        )}
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Guardar cambios" : "Crear artículo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
