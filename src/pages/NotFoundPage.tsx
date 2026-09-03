import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Compass className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">Página no encontrada</h1>
      <p className="mt-1 text-sm text-slate-500">La página que buscas no existe o ha sido movida.</p>
      <Link to="/" className="mt-5">
        <Button>Volver al dashboard</Button>
      </Link>
    </div>
  );
}
