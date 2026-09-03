import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ReceiptStatusBadge } from "@/components/domain/StatusBadges";
import { useReceipts } from "@/hooks/useReceipts";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { ReceiptFormModal } from "./ReceiptFormModal";
import type { ReceiptStatus } from "@/types/receipt";

const PAGE_SIZE = 15;

export function ReceiptsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<ReceiptStatus | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useReceipts({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Entradas"
        description="Recepciones de mercancía procedentes de proveedores."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva recepción
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por código o proveedor…" className="sm:max-w-xs" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as ReceiptStatus | ""); setPage(1); }} className="sm:w-48">
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="RECEIVING">Recibiendo</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELLED">Cancelada</option>
          </Select>
        </div>

        {isLoading && <LoadingState label="Cargando recepciones…" />}
        {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}
        {data && data.rows.length === 0 && (
          <EmptyState icon={<PackagePlus className="h-5 w-5" />} title="No hay recepciones" description="Crea una nueva recepción para empezar a recibir mercancía." />
        )}

        {data && data.rows.length > 0 && (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-4 py-2.5">Proveedor</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5">Fecha prevista</th>
                    <th className="px-4 py-2.5">Creada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate(`/receipts/${receipt.id}`)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-800">{receipt.code}</td>
                      <td className="px-4 py-2.5 text-slate-700">{receipt.supplierName ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <ReceiptStatusBadge status={receipt.status} />
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{receipt.expectedDate ? formatDate(receipt.expectedDate) : "—"}</td>
                      <td className="px-4 py-2.5 text-slate-400">{formatDateTime(receipt.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 sm:hidden">
              {data.rows.map((receipt) => (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() => navigate(`/receipts/${receipt.id}`)}
                  className="flex flex-col gap-1 px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-primary-800">{receipt.code}</span>
                    <ReceiptStatusBadge status={receipt.status} />
                  </div>
                  <div className="text-sm text-slate-600">{receipt.supplierName ?? "Sin proveedor"}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(receipt.createdAt)}</div>
                </button>
              ))}
            </div>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ReceiptFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          navigate(`/receipts/${id}`);
        }}
      />
    </div>
  );
}
