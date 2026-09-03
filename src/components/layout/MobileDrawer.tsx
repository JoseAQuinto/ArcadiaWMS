import { SidebarContent } from "./Sidebar";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
