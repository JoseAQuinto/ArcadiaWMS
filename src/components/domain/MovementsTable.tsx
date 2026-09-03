import { MovementTypeBadge, ADJUSTMENT_REASON_LABELS } from "./StatusBadges";
import { formatDateTime, formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/States";
import { History } from "lucide-react";
import type { Movement } from "@/types/movement";

function referenceLabel(movement: Movement): string {
  if (movement.referenceType === "RECEIPT") return `Recepción #${movement.referenceId}`;
  if (movement.referenceType === "OUTBOUND_ORDER") return `Salida #${movement.referenceId}`;
  if (movement.reason) return ADJUSTMENT_REASON_LABELS[movement.reason];
  return "—";
}

export function MovementsTable({ movements }: { movements: Movement[] }) {
  if (movements.length === 0) {
    return <EmptyState icon={<History className="h-5 w-5" />} title="Sin movimientos" description="Todavía no hay movimientos que coincidan con los filtros." />;
  }

  return (
    <div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Artículo</th>
              <th className="px-4 py-2.5 text-right font-medium">Cantidad</th>
              <th className="px-4 py-2.5 font-medium">Origen</th>
              <th className="px-4 py-2.5 font-medium">Destino</th>
              <th className="px-4 py-2.5 font-medium">Referencia</th>
              <th className="px-4 py-2.5 font-medium">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((movement) => (
              <tr key={movement.id} className="hover:bg-slate-50" title={movement.notes ?? undefined}>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{formatDateTime(movement.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <MovementTypeBadge type={movement.type} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-800">{movement.itemName}</div>
                  <div className="text-xs text-slate-400">{movement.sku}</div>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatNumber(movement.quantity)}</td>
                <td className="px-4 py-2.5 text-slate-500">{movement.sourceLocationCode ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-500">{movement.destinationLocationCode ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-500">{referenceLabel(movement)}</td>
                <td className="px-4 py-2.5 text-slate-500">{movement.userName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col divide-y divide-slate-100 sm:hidden">
        {movements.map((movement) => (
          <div key={movement.id} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex items-center justify-between">
              <MovementTypeBadge type={movement.type} />
              <span className="text-xs text-slate-400">{formatDateTime(movement.createdAt)}</span>
            </div>
            <div className="text-sm font-medium text-slate-800">
              {movement.itemName} <span className="font-normal text-slate-400">({movement.sku})</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                {movement.sourceLocationCode ?? "—"} → {movement.destinationLocationCode ?? "—"}
              </span>
              <span className="font-semibold text-slate-800">{formatNumber(movement.quantity)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
