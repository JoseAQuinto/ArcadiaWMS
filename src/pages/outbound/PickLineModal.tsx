import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useStockByItem } from "@/hooks/useStock";
import { usePickLine } from "@/hooks/useOutbound";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import type { OutboundOrderLine } from "@/types/outbound";

export function PickLineModal({
  orderId,
  line,
  onClose,
}: {
  orderId: number;
  line: OutboundOrderLine | null;
  onClose: () => void;
}) {
  const { data: stockRows } = useStockByItem(line?.itemId);
  const pickLine = usePickLine();
  const { showToast } = useToast();

  const remaining = line ? line.requestedQuantity - line.pickedQuantity : 0;

  const [quantity, setQuantity] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (line) {
      setQuantity(String(remaining));
      setLocationId("");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line]);

  const selectedRow = stockRows?.find((row) => String(row.locationId) === locationId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!line) return;
    setError(null);

    const parsedQuantity = Number(quantity);
    if (!parsedQuantity || parsedQuantity <= 0) {
      setError("Indica una cantidad mayor que 0.");
      return;
    }
    if (parsedQuantity > remaining) {
      setError(`La cantidad no puede superar lo pendiente (${remaining}).`);
      return;
    }
    if (!locationId) {
      setError("Selecciona la ubicación de origen.");
      return;
    }
    if (selectedRow && parsedQuantity > selectedRow.quantity) {
      setError(`Esa ubicación solo tiene ${selectedRow.quantity} unidades disponibles.`);
      return;
    }

    try {
      await pickLine.mutateAsync({
        orderId,
        input: { lineId: line.id, quantity: parsedQuantity, locationId: Number(locationId) },
      });
      showToast(`Se han preparado ${parsedQuantity} ${line.unit} de ${line.itemName}.`);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={line !== null} onClose={onClose} title="Preparar pedido" description={line ? `${line.sku} — ${line.itemName}` : undefined} size="sm">
      {line && (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Pendiente de preparar: <span className="font-semibold text-slate-800">{remaining}</span> {line.unit}
          </p>

          {stockRows && stockRows.length === 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No hay stock disponible de este artículo en ninguna ubicación.
            </p>
          )}

          <Select id="locationId" label="Ubicación origen" required value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Selecciona una ubicación</option>
            {stockRows?.map((row) => (
              <option key={row.locationId} value={row.locationId}>
                {row.locationCode} · {formatNumber(row.quantity)} disponibles
              </option>
            ))}
          </Select>
          <Input
            id="quantity"
            label="Cantidad a preparar"
            type="number"
            min={1}
            max={remaining}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={pickLine.isPending}>
              Confirmar preparación
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
