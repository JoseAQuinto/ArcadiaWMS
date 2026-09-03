import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import { Boxes } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/navigation";
import { useAuth } from "@/context/AuthContext";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col bg-primary-950 text-slate-200">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500 text-white">
          <Boxes className="h-5 w-5" />
        </span>
        <span className="text-base font-semibold tracking-tight text-white">Arcadia WMS</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_SECTIONS.map((section, index) => {
          const items = section.items.filter((item) => !item.adminOnly || user?.role === "ADMIN");
          if (items.length === 0) return null;
          return (
            <div key={section.label ?? index} className="mb-4">
              {section.label && (
                <p className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {section.label}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        clsx(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive ? "bg-primary-800 text-white" : "text-slate-300 hover:bg-primary-900 hover:text-white"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-primary-900 px-4 py-3 text-xs text-slate-500">Arcadia WMS · v1.0</div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="fixed inset-y-0 left-0 w-64">
        <SidebarContent />
      </div>
    </aside>
  );
}
