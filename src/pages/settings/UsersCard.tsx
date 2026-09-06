import { useState } from "react";
import { Plus, Pencil, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useUsers } from "@/hooks/useUsers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import { UserFormModal } from "./UserFormModal";
import type { ManagedUser } from "@/types/user";

const PAGE_SIZE = 10;

export function UsersCard() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [modalUser, setModalUser] = useState<ManagedUser | null | undefined>(undefined);

  const { data, isLoading, isError, error, refetch } = useUsers({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" /> Usuarios
          </span>
        }
        description="Altas, bajas y roles de las personas que operan el almacén."
        actions={
          <Button size="sm" onClick={() => setModalUser(null)}>
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        }
      />

      <div className="border-b border-slate-100 p-4">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, usuario o email…"
          className="sm:max-w-xs"
        />
      </div>

      {isLoading && <LoadingState label="Cargando usuarios…" />}
      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {data && data.rows.length === 0 && (
        <EmptyState icon={<Users className="h-5 w-5" />} title="No se encontraron usuarios" />
      )}

      {data && data.rows.length > 0 && (
        <>
          <ul className="divide-y divide-slate-100">
            {data.rows.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{user.fullName}</span>
                    <Badge tone={user.role === "ADMIN" ? "violet" : "slate"}>
                      {user.role === "ADMIN" ? "Administrador" : "Operario"}
                    </Badge>
                    <Badge tone={user.active ? "emerald" : "slate"}>{user.active ? "Activo" : "Inactivo"}</Badge>
                    {currentUser?.id === user.id && <span className="text-xs text-slate-400">(tú)</span>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    <span className="font-mono text-xs">{user.username}</span> · {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalUser(user)}
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`Editar ${user.fullName}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </>
      )}

      <UserFormModal open={modalUser !== undefined} onClose={() => setModalUser(undefined)} user={modalUser} />
    </Card>
  );
}
