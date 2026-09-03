import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Package, Boxes, MapPin, CheckCircle2, PackagePlus, PackageMinus } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { MovementsTable } from "@/components/domain/MovementsTable";
import { formatNumber } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";

const DAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  return (
    <div>
      <PageHeader title="Dashboard" description="Visión general del almacén en tiempo real." />

      {isLoading && <LoadingState label="Cargando dashboard…" />}
      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {data && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Artículos activos" value={formatNumber(data.totalItems)} icon={Package} />
            <StatCard label="Stock total (unidades)" value={formatNumber(data.totalStock)} icon={Boxes} tone="emerald" />
            <StatCard
              label="Ubicaciones disponibles"
              value={`${formatNumber(data.availableLocations)} / ${formatNumber(data.totalLocations)}`}
              icon={MapPin}
              tone="slate"
            />
            <StatCard label="Ocupación del almacén" value={`${data.occupancyPercent}%`} icon={CheckCircle2} tone="amber" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <StatCard label="Entradas pendientes" value={formatNumber(data.pendingReceipts)} icon={PackagePlus} tone="primary" />
            <StatCard label="Salidas pendientes" value={formatNumber(data.pendingOutbound)} icon={PackageMinus} tone="amber" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Movimientos — últimos 7 días" description="Número de movimientos de stock por día." />
              <div className="h-64 px-2 pb-4 pt-2 sm:px-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.movementsLast7Days} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(value: string) => DAY_LABELS[new Date(value).getUTCDay()] ?? ""}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value: number) => [value, "Movimientos"]}
                      labelFormatter={(value: string) => new Date(value).toLocaleDateString("es-ES")}
                      contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: "#e2e8f0" }}
                    />
                    <Bar dataKey="count" fill="#215884" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Stock por categoría" description="Unidades totales agrupadas por categoría." />
              <div className="h-64 px-2 pb-4 pt-2 sm:px-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.stockByCategory} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="categoryName"
                      width={110}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatNumber(value), "Unidades"]}
                      contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: "#e2e8f0" }}
                    />
                    <Bar dataKey="totalQuantity" fill="#2c6ea6" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Movimientos recientes" description="Últimas operaciones registradas en el almacén." />
            <MovementsTable movements={data.recentMovements} />
          </Card>
        </div>
      )}
    </div>
  );
}
