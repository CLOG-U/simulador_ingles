import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

interface AppShellProps {
  title: string;
  children: ReactNode;
  nav?: { to: string; label: string }[];
}

export function AppShell({ title, children, nav = [] }: AppShellProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand-primary text-brand-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs text-brand-sky">Powerful English Academy</p>
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span>{user?.full_name}</span>
            <button
              type="button"
              onClick={() => void logout().then(() => (window.location.href = "/login"))}
              className="min-h-11 rounded-lg px-3 underline"
            >
              Salir
            </button>
          </div>
        </div>
        {nav.length > 0 && (
          <nav className="border-t border-brand-primary-dark/30">
            <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 py-2 text-sm">
              {nav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="block min-h-11 whitespace-nowrap rounded-lg px-3 py-2 hover:bg-brand-primary-dark"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

export const adminNav = [
  { to: "/admin", label: "Resumen" },
  { to: "/admin/users", label: "Usuarios" },
  { to: "/admin/verbs", label: "Verbos" },
  { to: "/admin/config", label: "Configuración" },
  { to: "/admin/results", label: "Resultados" },
  { to: "/admin/audit", label: "Auditoría" },
];
