import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Boxes, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";

const DEMO_ACCOUNTS = [
  { label: "Administrador", identifier: "admin", password: "Admin123!" },
  { label: "Operario", identifier: "operator", password: "Operator123!" },
];

export function LoginPage() {
  const { login, status } = useAuth();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500">
            <Boxes className="h-6 w-6" />
          </span>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight">Arcadia WMS</h1>
            <p className="text-sm text-primary-300">Sistema de gestión de almacenes</p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-xl">
          <h2 className="text-base font-semibold text-slate-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">Accede con tu usuario o email corporativo.</p>

          <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              id="identifier"
              label="Usuario o email"
              placeholder="admin"
              autoComplete="username"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
            <Input
              id="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <Button type="submit" className="mt-1 w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </div>

        <div className="mt-5 rounded-xl border border-primary-800 bg-primary-900/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-300">Cuentas de demostración</p>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.identifier}
                type="button"
                onClick={() => {
                  setIdentifier(account.identifier);
                  setPassword(account.password);
                }}
                className="flex items-center justify-between rounded-md bg-primary-950/60 px-3 py-2 text-left text-xs text-primary-100 hover:bg-primary-950"
              >
                <span className="font-medium">{account.label}</span>
                <span className="text-primary-400">
                  {account.identifier} / {account.password}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
