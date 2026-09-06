import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Boxes, MapPin, Pencil, TriangleAlert, History } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/domain/StatCard";
import { MovementsTable } from "@/components/domain/MovementsTable";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useItem } from "@/hooks/useItems";
import { useMovements } from "@/hooks/useMovements";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatNumber } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { ItemFormModal } from "./ItemFormModal";

const RECENT_MOVEMENTS = 10;

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  // A non-numeric id in the URL must not reach the API as "NaN".
  const itemId = id && /^\d+$/.test(id) ? Number(id) : undefined;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [editing, setEditing] = useState(false);

  const { data: item, isLoading, isError, error, refetch } = useItem(itemId);
  // The ledger already answers "what happened to this item", so the detail page
  // reuses it instead of adding a second history endpoint.
  const { data: movements } = useMovements({ itemId, page: 1, pageSize: RECENT_MOVEMENTS });

  if (isLoading) return <LoadingState label="Cargando artículo…" />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!item) return <ErrorState message="Artículo no encontrado." />;

  const lowStock = item.totalStock < item.minimumStock;

  return (
    <div>
      <Link to="/items" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Volver a artículos
      </Link>

      <PageHeader
        title={item.name}
        description={`${item.sku} · ${item.categoryName ?? "Sin categoría"}`}
        actions={
          <>
            <Badge tone={item.active ? "emerald" : "slate"}>{item.active ? "Activo" : "Inactivo"}</Badge>
            {isAdmin && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Stock total"
          value={`${formatNumber(item.totalStock)} ${item.unit}`}
          icon={Boxes}
          tone={lowStock ? "amber" : "primary"}
          hint={lowStock ? "Por debajo del stock mínimo" : undefined}
        />
        <StatCard
          label="Stock mínimo"
          value={`${formatNumber(item.minimumStock)} ${item.unit}`}
          icon={TriangleAlert}
          tone="slate"
        />
        <StatCard
          label="Ubicaciones con stock"
          value={formatNumber(item.stockByLocation.length)}
          icon={MapPin}
          tone="slate"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Datos del artículo" />
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-3 px-4 py-3 sm:px-5">
              <dt className="text-slate-500">SKU</dt>
              <dd className="font-mono text-xs text-slate-700">{item.sku}</dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-3 sm:px-5">
              <dt className="text-slate-500">Categoría</dt>
              <dd className="text-slate-700">{item.categoryName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-3 sm:px-5">
              <dt className="text-slate-500">Unidad</dt>
              <dd className="text-slate-700">{item.unit}</dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-3 sm:px-5">
              <dt className="text-slate-500">Alta</dt>
              <dd className="text-slate-700">{formatDate(item.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-3 sm:px-5">
              <dt className="text-slate-500">Última modificación</dt>
              <dd className="text-slate-700">{formatDate(item.updatedAt)}</dd>
            </div>
            {item.description && (
              <div className="px-4 py-3 sm:px-5">
                <dt className="text-slate-500">Descripción</dt>
                <dd className="mt-1 whitespace-pre-line text-slate-700">{item.description}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Stock por ubicación" description="Solo se listan las ubicaciones con existencias." />
          {item.stockByLocation.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-5 w-5" />}
              title="Sin stock en el almacén"
              description="Este artículo no tiene existencias en ninguna ubicación."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Ubicación</th>
                    <th className="px-4 py-2.5">Almacén</th>
                    <th className="px-4 py-2.5 text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {item.stockByLocation.map((row) => (
                    <tr key={row.locationId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{row.locationCode}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.warehouseCode}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {formatNumber(row.quantity)} <span className="text-slate-400">{item.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" /> Últimos movimientos
            </span>
          }
          description={`Los ${RECENT_MOVEMENTS} movimientos más recientes de este artículo.`}
          actions={
            <Link
              to="/movements"
              className="text-sm font-medium text-primary-800 hover:text-primary-900"
            >
              Ver histórico completo
            </Link>
          }
        />
        {movements ? <MovementsTable movements={movements.rows} /> : <LoadingState label="Cargando movimientos…" />}
      </Card>

      <ItemFormModal open={editing} onClose={() => setEditing(false)} item={item} />
    </div>
  );
}
