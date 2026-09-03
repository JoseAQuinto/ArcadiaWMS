import { useMemo, useState } from "react";
import { Plus, Lock, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useLocations } from "@/hooks/useLocations";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import { LocationDetailModal } from "./LocationDetailModal";
import { LocationFormModal } from "./LocationFormModal";
import type { Location, LocationStatus } from "@/types/location";

const STATUS_CARD_STYLES: Record<LocationStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300",
  OCCUPIED: "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300",
  BLOCKED: "border-red-200 bg-red-50 text-red-700 hover:border-red-300",
};

const LEGEND: { status: LocationStatus; label: string }[] = [
  { status: "AVAILABLE", label: "Libre" },
  { status: "PARTIAL", label: "Parcial" },
  { status: "OCCUPIED", label: "Ocupada" },
  { status: "BLOCKED", label: "Bloqueada" },
];

function locationCardLabel(location: Location): string {
  if (location.status === "AVAILABLE") return "LIBRE";
  if (location.status === "BLOCKED") return "BLOQUEADA";
  if (location.occupancyPercent !== null) return `${location.occupancyPercent}%`;
  return `${location.quantity} ud.`;
}

export function LocationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LocationStatus | "">("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useLocations({
    status: status || undefined,
    search: search || undefined,
  });

  const zones = useMemo(() => {
    if (!data) return [];
    const byZone = new Map<string, Location[]>();
    for (const location of data) {
      const list = byZone.get(location.zone) ?? [];
      list.push(location);
      byZone.set(location.zone, list);
    }
    return Array.from(byZone.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([zone, locations]) => ({ zone, locations: locations.sort((a, b) => a.code.localeCompare(b.code)) }));
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Ubicaciones"
        description="Mapa visual del almacén por zonas y ocupación."
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nueva ubicación
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código…" className="sm:max-w-xs" />
            <Select value={status} onChange={(e) => setStatus(e.target.value as LocationStatus | "")} className="sm:w-44">
              <option value="">Todos los estados</option>
              <option value="AVAILABLE">Libre</option>
              <option value="PARTIAL">Parcial</option>
              <option value="OCCUPIED">Ocupada</option>
              <option value="BLOCKED">Bloqueada</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {LEGEND.map((entry) => (
              <span key={entry.status} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={clsx("h-2.5 w-2.5 rounded-full border", STATUS_CARD_STYLES[entry.status])} />
                {entry.label}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {isLoading && <LoadingState label="Cargando ubicaciones…" />}
          {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}
          {data && zones.length === 0 && (
            <EmptyState icon={<MapPin className="h-5 w-5" />} title="No hay ubicaciones" description="Ajusta los filtros o crea una nueva ubicación." />
          )}

          <div className="flex flex-col gap-6">
            {zones.map(({ zone, locations }) => (
              <div key={zone}>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Zona {zone}</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setSelectedLocationId(location.id)}
                      className={clsx(
                        "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center transition-colors",
                        STATUS_CARD_STYLES[location.status]
                      )}
                    >
                      <span className="flex items-center gap-1 font-mono text-xs font-semibold">
                        {location.status === "BLOCKED" && <Lock className="h-3 w-3" />}
                        {location.code}
                      </span>
                      <span className="text-xs font-medium">{locationCardLabel(location)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <LocationDetailModal locationId={selectedLocationId} onClose={() => setSelectedLocationId(null)} />
      <LocationFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
