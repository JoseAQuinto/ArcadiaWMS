import { useState } from "react";
import { Plus, Pencil, Warehouse as WarehouseIcon, Tags } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useCategories } from "@/hooks/useCategories";
import { useWarehouses } from "@/hooks/useWarehouses";
import { CategoryFormModal } from "./CategoryFormModal";
import type { Category } from "@/types/category";

export function SettingsPage() {
  const { data: categories, isLoading } = useCategories(true);
  const { data: warehouses } = useWarehouses();
  const [modalCategory, setModalCategory] = useState<Category | null | undefined>(undefined);

  return (
    <div>
      <PageHeader title="Configuración" description="Datos maestros de categorías y almacenes." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-slate-400" /> Categorías
              </span>
            }
            description="Clasificación de artículos del catálogo."
            actions={
              <Button size="sm" onClick={() => setModalCategory(null)}>
                <Plus className="h-4 w-4" /> Nueva
              </Button>
            }
          />
          {isLoading && <LoadingState />}
          {categories && categories.length === 0 && <EmptyState title="Sin categorías" />}
          {categories && categories.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{category.name}</span>
                      <Badge tone={category.active ? "emerald" : "slate"}>{category.active ? "Activa" : "Inactiva"}</Badge>
                    </div>
                    {category.description && <p className="mt-0.5 truncate text-sm text-slate-500">{category.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalCategory(category)}
                    className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`Editar ${category.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <WarehouseIcon className="h-4 w-4 text-slate-400" /> Almacenes
              </span>
            }
            description="Almacenes gestionados por Arcadia WMS."
          />
          <ul className="divide-y divide-slate-100">
            {warehouses?.map((warehouse) => (
              <li key={warehouse.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div>
                  <div className="font-medium text-slate-800">{warehouse.name}</div>
                  <div className="font-mono text-xs text-slate-400">{warehouse.code}</div>
                </div>
                <Badge tone={warehouse.active ? "emerald" : "slate"}>{warehouse.active ? "Activo" : "Inactivo"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <CategoryFormModal open={modalCategory !== undefined} onClose={() => setModalCategory(undefined)} category={modalCategory} />
    </div>
  );
}
