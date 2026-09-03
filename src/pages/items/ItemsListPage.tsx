import { useState } from "react";
import { Plus, Package, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useItems } from "@/hooks/useItems";
import { useCategories } from "@/hooks/useCategories";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/context/AuthContext";
import { formatNumber } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { ItemFormModal } from "./ItemFormModal";
import type { Item } from "@/types/item";

const PAGE_SIZE = 20;

export function ItemsListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [categoryId, setCategoryId] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(1);
  const [modalItem, setModalItem] = useState<Item | null | undefined>(undefined);

  const { data: categories } = useCategories();
  const { data, isLoading, isError, error, refetch } = useItems({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    active: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  return (
    <div>
      <PageHeader
        title="Artículos"
        description="Catálogo maestro de artículos gestionados en el almacén."
        actions={
          isAdmin && (
            <Button onClick={() => setModalItem(null)}>
              <Plus className="h-4 w-4" /> Nuevo artículo
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por SKU o nombre…" className="sm:max-w-xs" />
          <Select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="sm:w-48"
          >
            <option value="">Todas las categorías</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value as typeof activeFilter); setPage(1); }} className="sm:w-40">
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="all">Todos</option>
          </Select>
        </div>

        {isLoading && <LoadingState label="Cargando artículos…" />}
        {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

        {data && data.rows.length === 0 && (
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title="No se encontraron artículos"
            description="Prueba a cambiar los filtros de búsqueda."
          />
        )}

        {data && data.rows.length > 0 && (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Nombre</th>
                    <th className="px-4 py-2.5">Categoría</th>
                    <th className="px-4 py-2.5 text-right">Stock</th>
                    <th className="px-4 py-2.5">Estado</th>
                    {isAdmin && <th className="px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((item) => {
                    const lowStock = item.totalStock < item.minimumStock;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{item.sku}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{item.categoryName ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={lowStock ? "font-semibold text-amber-600" : "text-slate-700"}>
                            {formatNumber(item.totalStock)}
                          </span>
                          <span className="text-slate-400"> {item.unit}</span>
                          {lowStock && <span className="ml-1.5 text-xs text-amber-600">(bajo mínimo)</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={item.active ? "emerald" : "slate"}>{item.active ? "Activo" : "Inactivo"}</Badge>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setModalItem(item)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label={`Editar ${item.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 sm:hidden">
              {data.rows.map((item) => {
                const lowStock = item.totalStock < item.minimumStock;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => isAdmin && setModalItem(item)}
                    className="flex flex-col gap-1 px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{item.name}</span>
                      <Badge tone={item.active ? "emerald" : "slate"}>{item.active ? "Activo" : "Inactivo"}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">{item.sku}</span>
                      <span>{item.categoryName ?? "Sin categoría"}</span>
                    </div>
                    <div className="text-sm">
                      <span className={lowStock ? "font-semibold text-amber-600" : "text-slate-700"}>
                        {formatNumber(item.totalStock)} {item.unit}
                      </span>
                      {lowStock && <span className="ml-1.5 text-xs text-amber-600">bajo mínimo</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ItemFormModal open={modalItem !== undefined} onClose={() => setModalItem(undefined)} item={modalItem} />
    </div>
  );
}
