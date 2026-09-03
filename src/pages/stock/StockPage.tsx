import { useState } from "react";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useStock } from "@/hooks/useStock";
import { useCategories } from "@/hooks/useCategories";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";

const PAGE_SIZE = 25;

export function StockPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [categoryId, setCategoryId] = useState("");
  const [onlyWithStock, setOnlyWithStock] = useState(true);
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const { data: categories } = useCategories();
  const { data, isLoading, isError, error, refetch } = useStock({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    onlyWithStock,
    lowStock,
  });

  return (
    <div>
      <PageHeader title="Stock" description="Consulta de existencias por artículo y ubicación." />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Buscar por SKU, artículo o ubicación…"
            className="sm:max-w-xs"
          />
          <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="sm:w-48">
            <option value="">Todas las categorías</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={onlyWithStock}
              onChange={(e) => { setOnlyWithStock(e.target.checked); setPage(1); }}
              className="h-4 w-4 rounded border-slate-300 text-primary-800 focus:ring-primary-800"
            />
            Solo con stock
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
              className="h-4 w-4 rounded border-slate-300 text-primary-800 focus:ring-primary-800"
            />
            Bajo mínimo
          </label>
        </div>

        {isLoading && <LoadingState label="Cargando stock…" />}
        {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}
        {data && data.rows.length === 0 && (
          <EmptyState icon={<Boxes className="h-5 w-5" />} title="Sin resultados" description="No hay stock que coincida con los filtros seleccionados." />
        )}

        {data && data.rows.length > 0 && (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Artículo</th>
                    <th className="px-4 py-2.5">Categoría</th>
                    <th className="px-4 py-2.5">Ubicación</th>
                    <th className="px-4 py-2.5">Almacén</th>
                    <th className="px-4 py-2.5 text-right">Cantidad</th>
                    <th className="px-4 py-2.5">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((row) => {
                    const low = row.quantity < row.minimumStock;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{row.sku}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{row.itemName}</td>
                        <td className="px-4 py-2.5 text-slate-500">{row.categoryName ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{row.locationCode}</td>
                        <td className="px-4 py-2.5 text-slate-500">{row.warehouseCode}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={low ? "font-semibold text-amber-600" : "text-slate-700"}>{formatNumber(row.quantity)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{formatDateTime(row.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 sm:hidden">
              {data.rows.map((row) => {
                const low = row.quantity < row.minimumStock;
                return (
                  <div key={row.id} className="flex flex-col gap-1 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{row.itemName}</span>
                      <span className={low ? "font-semibold text-amber-600" : "text-slate-700"}>{formatNumber(row.quantity)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">{row.sku}</span>
                      <span className="font-mono">{row.locationCode}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
