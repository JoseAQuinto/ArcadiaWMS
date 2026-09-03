import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useCreateLocation } from "@/hooks/useLocations";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";

export function LocationFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: warehouses } = useWarehouses();
  const createLocation = useCreateLocation();
  const { showToast } = useToast();

  const [warehouseId, setWarehouseId] = useState("");
  const [code, setCode] = useState("");
  const [zone, setZone] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWarehouseId(warehouses?.[0] ? String(warehouses[0].id) : "");
      setCode("");
      setZone("");
      setCapacity("");
      setError(null);
    }
  }, [open, warehouses]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createLocation.mutateAsync({
        warehouseId: Number(warehouseId),
        code: code.trim().toUpperCase(),
        zone: zone.trim().toUpperCase(),
        capacity: capacity ? Number(capacity) : null,
      });
      showToast("Ubicación creada correctamente.");
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva ubicación" size="sm">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Select id="warehouseId" label="Almacén" required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          {warehouses?.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </Select>
        <Input id="code" label="Código" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="A-04-01" />
        <Input id="zone" label="Zona" required value={zone} onChange={(e) => setZone(e.target.value)} placeholder="A" />
        <Input
          id="capacity"
          label="Capacidad"
          type="number"
          min={1}
          hint="Déjalo vacío si no quieres limitar la capacidad."
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={createLocation.isPending}>
            Crear ubicación
          </Button>
        </div>
      </form>
    </Modal>
  );
}
