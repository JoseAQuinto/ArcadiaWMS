import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PackageMinus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { OutboundStatusBadge } from "@/components/domain/StatusBadges";
import { useOutboundOrders } from "@/hooks/useOutbound";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { OutboundFormModal } from "./OutboundFormModal";
import type { OutboundStatus } from "@/types/outbound";

const PAGE_SIZE = 15;

export function OutboundListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<OutboundStatus | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useOutboundOrders({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Salidas"
        description="Pedidos de salida y preparación de mercancía."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo pedido
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por código o cliente…" className="sm:max-w-xs" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as OutboundStatus | ""); setPage(1); }} className="sm:w-48">
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PICKING">Preparando</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELLED">Cancelado</option>
          </Select>
        </div>

        {isLoading && <LoadingState label="Cargando pedidos…" />}
        {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}
        {data && data.rows.length === 0 && (
          <EmptyState icon={<PackageMinus className="h-5 w-5" />} title="No hay pedidos de salida" description="Crea un nuevo pedido para empezar a preparar envíos." />
        )}

        {data && data.rows.length > 0 && (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((order) => (
                    <tr key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/outbound-orders/${order.id}`)}>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-800">{order.code}</td>
                      <td className="px-4 py-2.5 text-slate-700">{order.customerName ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <OutboundStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{formatDateTime(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 sm:hidden">
              {data.rows.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => navigate(`/outbound-orders/${order.id}`)}
                  className="flex flex-col gap-1 px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-primary-800">{order.code}</span>
                    <OutboundStatusBadge status={order.status} />
                  </div>
                  <div className="text-sm text-slate-600">{order.customerName ?? "Sin cliente"}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</div>
                </button>
              ))}
            </div>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <OutboundFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          navigate(`/outbound-orders/${id}`);
        }}
      />
    </div>
  );
}
