import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useLocations } from "@/hooks/useLocations";
import { useReceiveLine } from "@/hooks/useReceipts";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";
import type { ReceiptLine } from "@/types/receipt";

export function ReceiveLineModal({
  receiptId,
  line,
  onClose,
}: {
  receiptId: number;
  line: ReceiptLine | null;
  onClose: () => void;
}) {
  const { data: locations } = useLocations({});
  const receiveLine = useReceiveLine();
  const { showToast } = useToast();

  const remaining = line ? line.expectedQuantity - line.receivedQuantity : 0;

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

  const availableLocations = (locations ?? []).filter((location) => location.status !== "BLOCKED");

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
      setError("Selecciona la ubicación destino.");
      return;
    }

    try {
      await receiveLine.mutateAsync({
        receiptId,
        input: { lineId: line.id, quantity: parsedQuantity, locationId: Number(locationId) },
      });
      showToast(`Se han recibido ${parsedQuantity} ${line.unit} de ${line.itemName}.`);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={line !== null} onClose={onClose} title="Recibir mercancía" description={line ? `${line.sku} — ${line.itemName}` : undefined} size="sm">
      {line && (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Pendiente de recibir: <span className="font-semibold text-slate-800">{remaining}</span> {line.unit}
          </p>
          <Input
            id="quantity"
            label="Cantidad a recibir"
            type="number"
            min={1}
            max={remaining}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Select id="locationId" label="Ubicación destino" required value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Selecciona una ubicación</option>
            {availableLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.code} · {location.status === "AVAILABLE" ? "libre" : `${location.occupancyPercent ?? "—"}%`}
              </option>
            ))}
          </Select>
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={receiveLine.isPending}>
              Confirmar recepción
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
