import { useEffect, useState } from "react";
import { Lock, Unlock, Save, Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { LocationStatusBadge } from "@/components/domain/StatusBadges";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useLocation, useUpdateLocation } from "@/hooks/useLocations";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";

export function LocationDetailModal({ locationId, onClose }: { locationId: number | null; onClose: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { data, isLoading } = useLocation(locationId ?? undefined);
  const updateLocation = useUpdateLocation();
  const { showToast } = useToast();

  const [capacity, setCapacity] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setCapacity(data.capacity ? String(data.capacity) : "");
      setBlocked(data.blocked);
      setError(null);
    }
  }, [data]);

  async function handleSave() {
    if (!data) return;
    setError(null);
    try {
      await updateLocation.mutateAsync({
        id: data.id,
        input: { capacity: capacity ? Number(capacity) : null, blocked },
      });
      showToast(`Ubicación ${data.code} actualizada correctamente.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={locationId !== null} onClose={onClose} title={data ? `Ubicación ${data.code}` : "Ubicación"} size="md">
      {isLoading && <LoadingState label="Cargando ubicación…" />}
      {data && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            <span>
              Almacén: <span className="font-medium text-slate-800">{data.warehouseCode}</span>
            </span>
            <span>
              Zona: <span className="font-medium text-slate-800">{data.zone}</span>
            </span>
            <LocationStatusBadge status={data.status} />
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Ocupación</span>
              <span className="font-medium text-slate-800">
                {formatNumber(data.quantity)}
                {data.capacity ? ` / ${formatNumber(data.capacity)}` : ""} unidades
                {data.occupancyPercent !== null ? ` · ${data.occupancyPercent}%` : ""}
              </span>
            </div>
            {data.capacity !== null && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary-700"
                  style={{ width: `${Math.min(100, data.occupancyPercent ?? 0)}%` }}
                />
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Contenido</h3>
            {data.stockItems.length === 0 ? (
              <EmptyState icon={<Package className="h-5 w-5" />} title="Ubicación vacía" />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Artículo</th>
                      <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.stockItems.map((stockItem) => (
                      <tr key={stockItem.itemId}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{stockItem.itemName}</div>
                          <div className="text-xs text-slate-400">{stockItem.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {formatNumber(stockItem.quantity)} {stockItem.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="rounded-lg border border-slate-200 p-3">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Editar ubicación</h3>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  id="capacity"
                  label="Capacidad"
                  type="number"
                  min={1}
                  placeholder="Sin límite"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="sm:max-w-[160px]"
                />
                <Button
                  type="button"
                  variant={blocked ? "danger" : "secondary"}
                  onClick={() => setBlocked((value) => !value)}
                >
                  {blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {blocked ? "Desbloquear" : "Bloquear"}
                </Button>
                <Button type="button" onClick={handleSave} loading={updateLocation.isPending}>
                  <Save className="h-4 w-4" /> Guardar
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
