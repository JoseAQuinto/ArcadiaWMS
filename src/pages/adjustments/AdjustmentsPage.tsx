import { useMemo, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { Plus, Minus, ClipboardEdit } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useItems } from "@/hooks/useItems";
import { useStockByItem } from "@/hooks/useStock";
import { useLocations } from "@/hooks/useLocations";
import { useCreateAdjustment, useMovements } from "@/hooks/useMovements";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { MovementsTable } from "@/components/domain/MovementsTable";
import { ADJUSTMENT_REASON_LABELS } from "@/components/domain/StatusBadges";
import type { AdjustmentDirection, AdjustmentReason } from "@/services/movements.api";

const REASONS = Object.keys(ADJUSTMENT_REASON_LABELS) as AdjustmentReason[];

export function AdjustmentsPage() {
  const { data: itemsData } = useItems({ pageSize: 200, active: true });
  const { data: allLocations } = useLocations({});
  const createAdjustment = useCreateAdjustment();
  const { showToast } = useToast();

  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [direction, setDirection] = useState<AdjustmentDirection>("INCREMENT");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("INVENTORY_COUNT");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: stockRows } = useStockByItem(itemId ? Number(itemId) : undefined);
  const currentQuantity = stockRows?.find((row) => String(row.locationId) === locationId)?.quantity ?? 0;

  const locationOptions = direction === "DECREMENT" ? stockRows ?? [] : allLocations ?? [];

  const recentIncrements = useMovements({ type: "ADJUSTMENT_IN", pageSize: 8 });
  const recentDecrements = useMovements({ type: "ADJUSTMENT_OUT", pageSize: 8 });
  const adjustmentMovements = [...(recentIncrements.data?.rows ?? []), ...(recentDecrements.data?.rows ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const canSubmit = useMemo(() => itemId && locationId && Number(quantity) > 0, [itemId, locationId, quantity]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedQuantity = Number(quantity);
    if (!parsedQuantity || parsedQuantity <= 0) {
      setError("Indica una cantidad mayor que 0.");
      return;
    }
    if (direction === "DECREMENT" && parsedQuantity > currentQuantity) {
      setError(`No hay stock suficiente en esa ubicación. Disponible: ${currentQuantity}.`);
      return;
    }

    try {
      await createAdjustment.mutateAsync({
        itemId: Number(itemId),
        locationId: Number(locationId),
        direction,
        quantity: parsedQuantity,
        reason,
        notes: notes.trim() || null,
      });
      showToast("Regularización registrada correctamente.");
      setItemId("");
      setLocationId("");
      setQuantity("");
      setNotes("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Regularizaciones" description="Corrige el inventario ante incidencias o recuentos." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Nueva regularización" />
          <form className="flex flex-col gap-4 p-4 sm:p-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setDirection("INCREMENT"); setLocationId(""); }}
                className={clsx(
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  direction === "INCREMENT" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Plus className="h-4 w-4" /> Incremento
              </button>
              <button
                type="button"
                onClick={() => { setDirection("DECREMENT"); setLocationId(""); }}
                className={clsx(
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  direction === "DECREMENT" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Minus className="h-4 w-4" /> Decremento
              </button>
            </div>

            <Select
              id="itemId"
              label="Artículo"
              required
              value={itemId}
              onChange={(e) => { setItemId(e.target.value); setLocationId(""); }}
            >
              <option value="">Selecciona un artículo</option>
              {itemsData?.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} — {item.name}
                </option>
              ))}
            </Select>

            <Select
              id="locationId"
              label="Ubicación"
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={!itemId}
              hint={direction === "DECREMENT" ? "Solo se muestran ubicaciones con stock de este artículo." : undefined}
            >
              <option value="">Selecciona una ubicación</option>
              {direction === "DECREMENT"
                ? (locationOptions as NonNullable<typeof stockRows>).map((row) => (
                    <option key={row.locationId} value={row.locationId}>
                      {row.locationCode} · {formatNumber(row.quantity)} disponibles
                    </option>
                  ))
                : (locationOptions as NonNullable<typeof allLocations>)
                    .filter((location) => location.status !== "BLOCKED")
                    .map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code}
                      </option>
                    ))}
            </Select>

            {locationId && (
              <p className="-mt-2 text-sm text-slate-500">
                Stock actual en esta ubicación: <span className="font-semibold text-slate-800">{formatNumber(currentQuantity)}</span>
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="quantity"
                label="Cantidad"
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Select id="reason" label="Motivo" required value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
                {REASONS.map((value) => (
                  <option key={value} value={value}>
                    {ADJUSTMENT_REASON_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>

            <Textarea id="notes" label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button type="submit" disabled={!canSubmit} loading={createAdjustment.isPending} className="self-start">
              <ClipboardEdit className="h-4 w-4" /> Confirmar regularización
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Últimas regularizaciones" />
          <MovementsTable movements={adjustmentMovements} />
        </Card>
      </div>
    </div>
  );
}
