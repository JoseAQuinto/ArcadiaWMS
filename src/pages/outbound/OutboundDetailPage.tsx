import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PackageCheck, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { OutboundStatusBadge } from "@/components/domain/StatusBadges";
import { useOutboundOrder, useUpdateOutboundOrder } from "@/hooks/useOutbound";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { PickLineModal } from "./PickLineModal";
import type { OutboundOrderLine } from "@/types/outbound";

export function OutboundDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error, refetch } = useOutboundOrder(orderId);
  const updateOutboundOrder = useUpdateOutboundOrder();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [activeLine, setActiveLine] = useState<OutboundOrderLine | null>(null);

  const isClosed = order?.status === "COMPLETED" || order?.status === "CANCELLED";

  async function handleCancel() {
    if (!order) return;
    const confirmed = await confirm({
      title: `¿Cancelar el pedido ${order.code}?`,
      message: "Esta acción no se puede deshacer.",
      confirmLabel: "Cancelar pedido",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await updateOutboundOrder.mutateAsync({ id: order.id, input: { status: "CANCELLED" } });
      showToast("Pedido cancelado.");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/outbound-orders")}
        className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a salidas
      </button>

      {isLoading && <LoadingState label="Cargando pedido…" />}
      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {order && (
        <>
          <PageHeader
            title={order.code}
            description={order.customerName ?? "Sin cliente"}
            actions={
              !isClosed && (
                <Button variant="secondary" onClick={handleCancel} loading={updateOutboundOrder.isPending}>
                  <XCircle className="h-4 w-4" /> Cancelar pedido
                </Button>
              )
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Líneas" description="Prepara cada línea indicando ubicación de origen y cantidad." />
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5">Artículo</th>
                      <th className="px-4 py-2.5 text-right">Solicitado</th>
                      <th className="px-4 py-2.5 text-right">Preparado</th>
                      <th className="px-4 py-2.5 text-right">Pendiente</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.lines.map((line) => {
                      const remaining = line.requestedQuantity - line.pickedQuantity;
                      return (
                        <tr key={line.id}>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-800">{line.itemName}</div>
                            <div className="text-xs text-slate-400">{line.sku}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatNumber(line.requestedQuantity)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatNumber(line.pickedQuantity)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatNumber(remaining)}</td>
                          <td className="px-4 py-2.5 text-right">
                            {remaining > 0 && !isClosed && (
                              <Button size="sm" onClick={() => setActiveLine(line)}>
                                <PackageCheck className="h-4 w-4" /> Preparar
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 sm:hidden">
                {order.lines.map((line) => {
                  const remaining = line.requestedQuantity - line.pickedQuantity;
                  return (
                    <div key={line.id} className="flex flex-col gap-2 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{line.itemName}</div>
                        <div className="text-xs text-slate-400">{line.sku}</div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {formatNumber(line.pickedQuantity)} / {formatNumber(line.requestedQuantity)}
                        </span>
                        {remaining > 0 && !isClosed && (
                          <Button size="sm" onClick={() => setActiveLine(line)}>
                            Preparar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHeader title="Detalles" />
              <dl className="flex flex-col gap-3 p-4 text-sm sm:p-5">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Estado</dt>
                  <dd>
                    <OutboundStatusBadge status={order.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Referencia externa</dt>
                  <dd className="text-right text-slate-700">{order.externalReference ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Creado por</dt>
                  <dd className="text-slate-700">{order.createdByName ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Creado</dt>
                  <dd className="text-slate-700">{formatDateTime(order.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Actualizado</dt>
                  <dd className="text-slate-700">{formatDateTime(order.updatedAt)}</dd>
                </div>
                {order.notes && (
                  <div>
                    <dt className="mb-1 text-slate-500">Notas</dt>
                    <dd className="rounded-md bg-slate-50 p-2 text-slate-600">{order.notes}</dd>
                  </div>
                )}
              </dl>
            </Card>
          </div>
        </>
      )}

      <PickLineModal orderId={orderId} line={activeLine} onClose={() => setActiveLine(null)} />
    </div>
  );
}
