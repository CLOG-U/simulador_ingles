import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { AcademyLogo } from "./AcademyLogo";

interface AppShellProps {
  title: string;
  children: ReactNode;
  nav?: { to: string; label: string }[];
  /** Wider content column for dense admin tables/actions. */
  wide?: boolean;
}

export function AppShell({ title: _title, children, nav = [], wide = false }: AppShellProps) {
  const { user, logout } = useAuth();
  const shellWidth = wide ? "max-w-7xl" : "max-w-5xl";

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand-primary text-brand-white">
        <div className={`mx-auto flex ${shellWidth} items-center justify-between px-4 py-4 sm:px-6`}>
          <div className="flex min-w-0 items-center gap-3">
            <AcademyLogo sizeClassName="h-11 w-11 sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <p className="text-xs text-brand-sky">Plataforma de estudio</p>
              <h1 className="truncate text-lg font-bold">Powerful English Academy</h1>
            </div>
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
            <ul className={`mx-auto flex ${shellWidth} gap-1 overflow-x-auto px-2 py-2 text-sm sm:px-4`}>
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
      <main className={`mx-auto ${shellWidth} px-4 py-6 sm:px-6`}>{children}</main>
    </div>
  );
}

export const studentNav = [
  { to: "/student", label: "Inicio" },
  { to: "/student/exams", label: "Exámenes" },
  { to: "/student/practice", label: "Práctica" },
];

export const adminNav = [
  { to: "/admin", label: "Resumen" },
  { to: "/admin/users", label: "Usuarios" },
  { to: "/admin/verbs", label: "Verbos" },
  { to: "/admin/past-simple", label: "Past Simple" },
  { to: "/admin/config", label: "Configuración" },
  { to: "/admin/results", label: "Resultados" },
  { to: "/admin/audit", label: "Auditoría" },
];
