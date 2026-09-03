import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute, AdminRoute } from "@/components/auth/ProtectedRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { LoadingState } from "@/components/ui/States";

const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ItemsListPage = lazy(() => import("@/pages/items/ItemsListPage").then((m) => ({ default: m.ItemsListPage })));
const LocationsPage = lazy(() => import("@/pages/locations/LocationsPage").then((m) => ({ default: m.LocationsPage })));
const StockPage = lazy(() => import("@/pages/stock/StockPage").then((m) => ({ default: m.StockPage })));
const ReceiptsListPage = lazy(() => import("@/pages/receipts/ReceiptsListPage").then((m) => ({ default: m.ReceiptsListPage })));
const ReceiptDetailPage = lazy(() => import("@/pages/receipts/ReceiptDetailPage").then((m) => ({ default: m.ReceiptDetailPage })));
const OutboundListPage = lazy(() => import("@/pages/outbound/OutboundListPage").then((m) => ({ default: m.OutboundListPage })));
const OutboundDetailPage = lazy(() => import("@/pages/outbound/OutboundDetailPage").then((m) => ({ default: m.OutboundDetailPage })));
const TransfersPage = lazy(() => import("@/pages/transfers/TransfersPage").then((m) => ({ default: m.TransfersPage })));
const AdjustmentsPage = lazy(() => import("@/pages/adjustments/AdjustmentsPage").then((m) => ({ default: m.AdjustmentsPage })));
const MovementsHistoryPage = lazy(() => import("@/pages/history/MovementsHistoryPage").then((m) => ({ default: m.MovementsHistoryPage })));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

function PageFallback() {
  return <LoadingState label="Cargando página…" />;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="items" element={<ItemsListPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="receipts" element={<ReceiptsListPage />} />
            <Route path="receipts/:id" element={<ReceiptDetailPage />} />
            <Route path="outbound-orders" element={<OutboundListPage />} />
            <Route path="outbound-orders/:id" element={<OutboundDetailPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="adjustments" element={<AdjustmentsPage />} />
            <Route path="movements" element={<MovementsHistoryPage />} />
            <Route element={<AdminRoute />}>
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
