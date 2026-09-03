import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useItems } from "@/hooks/useItems";
import { useStockByItem } from "@/hooks/useStock";
import { useLocations } from "@/hooks/useLocations";
import { useCreateTransfer, useMovements } from "@/hooks/useMovements";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { MovementsTable } from "@/components/domain/MovementsTable";

export function TransfersPage() {
  const { data: itemsData } = useItems({ pageSize: 200, active: true });
  const { data: allLocations } = useLocations({});
  const createTransfer = useCreateTransfer();
  const { showToast } = useToast();

  const [itemId, setItemId] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: stockRows } = useStockByItem(itemId ? Number(itemId) : undefined);
  const selectedSource = stockRows?.find((row) => String(row.locationId) === sourceLocationId);
  const destinationOptions = (allLocations ?? []).filter(
    (location) => location.status !== "BLOCKED" && String(location.id) !== sourceLocationId
  );

  const recentTransfers = useMovements({ type: "TRANSFER", pageSize: 8 });

  const availableQuantity = selectedSource?.quantity ?? 0;

  const canSubmit = useMemo(
    () => itemId && sourceLocationId && destinationLocationId && Number(quantity) > 0,
    [itemId, sourceLocationId, destinationLocationId, quantity]
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedQuantity = Number(quantity);
    if (!parsedQuantity || parsedQuantity <= 0) {
      setError("Indica una cantidad mayor que 0.");
      return;
    }
    if (parsedQuantity > availableQuantity) {
      setError(`No hay stock suficiente en el origen. Disponible: ${availableQuantity}.`);
      return;
    }

    try {
      await createTransfer.mutateAsync({
        itemId: Number(itemId),
        sourceLocationId: Number(sourceLocationId),
        destinationLocationId: Number(destinationLocationId),
        quantity: parsedQuantity,
        notes: notes.trim() || null,
      });
      showToast("Transferencia realizada correctamente.");
      setItemId("");
      setSourceLocationId("");
      setDestinationLocationId("");
      setQuantity("");
      setNotes("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Movimientos" description="Transfiere stock entre ubicaciones del almacén." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Nueva transferencia" />
          <form className="flex flex-col gap-4 p-4 sm:p-5" onSubmit={handleSubmit}>
            <Select
              id="itemId"
              label="Artículo"
              required
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setSourceLocationId("");
                setError(null);
              }}
            >
              <option value="">Selecciona un artículo</option>
              {itemsData?.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} — {item.name}
                </option>
              ))}
            </Select>

            <Select
              id="sourceLocationId"
              label="Ubicación origen"
              required
              value={sourceLocationId}
              onChange={(e) => {
                setSourceLocationId(e.target.value);
                setError(null);
              }}
              disabled={!itemId}
              hint={!itemId ? "Selecciona primero un artículo." : undefined}
            >
              <option value="">Selecciona una ubicación</option>
              {stockRows?.map((row) => (
                <option key={row.locationId} value={row.locationId}>
                  {row.locationCode} · {formatNumber(row.quantity)} disponibles
                </option>
              ))}
            </Select>

            {sourceLocationId && (
              <p className="-mt-2 text-sm text-slate-500">
                Stock disponible: <span className="font-semibold text-slate-800">{formatNumber(availableQuantity)}</span>
              </p>
            )}

            <Select
              id="destinationLocationId"
              label="Ubicación destino"
              required
              value={destinationLocationId}
              onChange={(e) => setDestinationLocationId(e.target.value)}
              disabled={!sourceLocationId}
            >
              <option value="">Selecciona una ubicación</option>
              {destinationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} · {location.status === "AVAILABLE" ? "libre" : `${location.occupancyPercent ?? "—"}%`}
                </option>
              ))}
            </Select>

            <Input
              id="quantity"
              label="Cantidad"
              type="number"
              min={1}
              max={availableQuantity || undefined}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!sourceLocationId}
            />

            <Textarea id="notes" label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button type="submit" disabled={!canSubmit} loading={createTransfer.isPending} className="self-start">
              <ArrowLeftRight className="h-4 w-4" /> Confirmar transferencia
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Últimas transferencias" />
          <MovementsTable movements={recentTransfers.data?.rows ?? []} />
        </Card>
      </div>
    </div>
  );
}
