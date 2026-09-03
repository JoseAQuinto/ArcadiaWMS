import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useItems } from "@/hooks/useItems";
import { useCreateOutboundOrder } from "@/hooks/useOutbound";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";

interface LineDraft {
  itemId: string;
  requestedQuantity: string;
}

export function OutboundFormModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const { data: itemsData } = useItems({ pageSize: 200, active: true });
  const createOutboundOrder = useCreateOutboundOrder();
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", requestedQuantity: "" }]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCustomerName("");
      setExternalReference("");
      setNotes("");
      setLines([{ itemId: "", requestedQuantity: "" }]);
      setError(null);
    }
  }, [open]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedLines = lines
      .filter((line) => line.itemId && line.requestedQuantity)
      .map((line) => ({ itemId: Number(line.itemId), requestedQuantity: Number(line.requestedQuantity) }));

    if (parsedLines.length === 0) {
      setError("Añade al menos una línea con artículo y cantidad solicitada.");
      return;
    }

    try {
      const order = await createOutboundOrder.mutateAsync({
        customerName: customerName.trim() || null,
        externalReference: externalReference.trim() || null,
        notes: notes.trim() || null,
        lines: parsedLines,
      });
      showToast(`Pedido ${order.code} creado correctamente.`);
      onCreated(order.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo pedido de salida" description="Registra un pedido para preparar y enviar." size="lg">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="customerName" label="Cliente" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Retail Norte S.L." />
          <Input id="externalReference" label="Referencia externa" value={externalReference} onChange={(e) => setExternalReference(e.target.value)} placeholder="SO-1234" />
        </div>
        <Textarea id="notes" label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Líneas del pedido</h3>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLines((c) => [...c, { itemId: "", requestedQuantity: "" }])}>
              <Plus className="h-4 w-4" /> Añadir línea
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {lines.map((line, index) => (
              <div key={index} className="flex items-end gap-2">
                <Select
                  label={index === 0 ? "Artículo" : undefined}
                  value={line.itemId}
                  onChange={(e) => updateLine(index, { itemId: e.target.value })}
                  className="flex-1"
                >
                  <option value="">Selecciona un artículo</option>
                  {itemsData?.rows.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} — {item.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label={index === 0 ? "Cantidad" : undefined}
                  type="number"
                  min={1}
                  value={line.requestedQuantity}
                  onChange={(e) => updateLine(index, { requestedQuantity: e.target.value })}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  aria-label="Eliminar línea"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={createOutboundOrder.isPending}>
            Crear pedido
          </Button>
        </div>
      </form>
    </Modal>
  );
}
