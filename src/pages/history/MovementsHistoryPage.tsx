import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { MovementsTable } from "@/components/domain/MovementsTable";
import { useMovements } from "@/hooks/useMovements";
import { useLocations } from "@/hooks/useLocations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getErrorMessage } from "@/lib/errors";
import type { MovementType } from "@/types/movement";

const PAGE_SIZE = 25;

export function MovementsHistoryPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [type, setType] = useState<MovementType | "">("");
  const [locationId, setLocationId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { data: locations } = useLocations({});
  const { data, isLoading, isError, error, refetch } = useMovements({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    type: type || undefined,
    locationId: locationId ? Number(locationId) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <div>
      <PageHeader title="Histórico" description="Trazabilidad completa de todos los movimientos de stock." />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por SKU o artículo…" className="sm:max-w-xs" />
            <Select value={type} onChange={(e) => { setType(e.target.value as MovementType | ""); setPage(1); }} className="sm:w-48">
              <option value="">Todos los tipos</option>
              <option value="RECEIPT">Entrada</option>
              <option value="OUTBOUND">Salida</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="ADJUSTMENT_IN">Ajuste (+)</option>
              <option value="ADJUSTMENT_OUT">Ajuste (-)</option>
            </Select>
            <Select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }} className="sm:w-44">
              <option value="">Todas las ubicaciones</option>
              {locations?.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Desde
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Hasta
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        </div>

        {isLoading && <LoadingState label="Cargando histórico…" />}
        {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

        {data && (
          <>
            <MovementsTable movements={data.rows} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
