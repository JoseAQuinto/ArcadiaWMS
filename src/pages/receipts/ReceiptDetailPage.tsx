import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PackageCheck, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ReceiptStatusBadge } from "@/components/domain/StatusBadges";
import { useReceipt, useUpdateReceipt } from "@/hooks/useReceipts";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { ReceiveLineModal } from "./ReceiveLineModal";
import type { ReceiptLine } from "@/types/receipt";

export function ReceiptDetailPage() {
  const { id } = useParams();
  const receiptId = Number(id);
  const navigate = useNavigate();
  const { data: receipt, isLoading, isError, error, refetch } = useReceipt(receiptId);
  const updateReceipt = useUpdateReceipt();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [activeLine, setActiveLine] = useState<ReceiptLine | null>(null);

  const isClosed = receipt?.status === "COMPLETED" || receipt?.status === "CANCELLED";

  async function handleCancel() {
    if (!receipt) return;
    const confirmed = await confirm({
      title: `¿Cancelar la recepción ${receipt.code}?`,
      message: "Esta acción no se puede deshacer.",
      confirmLabel: "Cancelar recepción",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await updateReceipt.mutateAsync({ id: receipt.id, input: { status: "CANCELLED" } });
      showToast("Recepción cancelada.");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/receipts")}
        className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a entradas
      </button>

      {isLoading && <LoadingState label="Cargando recepción…" />}
      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {receipt && (
        <>
          <PageHeader
            title={receipt.code}
            description={receipt.supplierName ?? "Sin proveedor"}
            actions={
              !isClosed && (
                <Button variant="secondary" onClick={handleCancel} loading={updateReceipt.isPending}>
                  <XCircle className="h-4 w-4" /> Cancelar recepción
                </Button>
              )
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Líneas" description="Recibe la mercancía indicando cantidad y ubicación destino." />
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5">Artículo</th>
                      <th className="px-4 py-2.5 text-right">Esperado</th>
                      <th className="px-4 py-2.5 text-right">Recibido</th>
                      <th className="px-4 py-2.5 text-right">Pendiente</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receipt.lines.map((line) => {
                      const remaining = line.expectedQuantity - line.receivedQuantity;
                      return (
                        <tr key={line.id}>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-800">{line.itemName}</div>
                            <div className="text-xs text-slate-400">{line.sku}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatNumber(line.expectedQuantity)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatNumber(line.receivedQuantity)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatNumber(remaining)}</td>
                          <td className="px-4 py-2.5 text-right">
                            {remaining > 0 && !isClosed && (
                              <Button size="sm" onClick={() => setActiveLine(line)}>
                                <PackageCheck className="h-4 w-4" /> Recibir
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
                {receipt.lines.map((line) => {
                  const remaining = line.expectedQuantity - line.receivedQuantity;
                  return (
                    <div key={line.id} className="flex flex-col gap-2 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{line.itemName}</div>
                        <div className="text-xs text-slate-400">{line.sku}</div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {formatNumber(line.receivedQuantity)} / {formatNumber(line.expectedQuantity)}
                        </span>
                        {remaining > 0 && !isClosed && (
                          <Button size="sm" onClick={() => setActiveLine(line)}>
                            Recibir
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
                    <ReceiptStatusBadge status={receipt.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Referencia externa</dt>
                  <dd className="text-right text-slate-700">{receipt.externalReference ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Fecha prevista</dt>
                  <dd className="text-slate-700">{receipt.expectedDate ? formatDate(receipt.expectedDate) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Creada por</dt>
                  <dd className="text-slate-700">{receipt.createdByName ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Creada</dt>
                  <dd className="text-slate-700">{formatDateTime(receipt.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Actualizada</dt>
                  <dd className="text-slate-700">{formatDateTime(receipt.updatedAt)}</dd>
                </div>
                {receipt.notes && (
                  <div>
                    <dt className="mb-1 text-slate-500">Notas</dt>
                    <dd className="rounded-md bg-slate-50 p-2 text-slate-600">{receipt.notes}</dd>
                  </div>
                )}
              </dl>
            </Card>
          </div>
        </>
      )}

      <ReceiveLineModal receiptId={receiptId} line={activeLine} onClose={() => setActiveLine(null)} />
    </div>
  );
}
