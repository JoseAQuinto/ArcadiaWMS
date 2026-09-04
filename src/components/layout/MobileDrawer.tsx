import { useEffect } from "react";
import { SidebarContent } from "./Sidebar";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Same behaviour as Modal: Escape closes it and the page behind stops
  // scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
      <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
