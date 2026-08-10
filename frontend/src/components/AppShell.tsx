import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
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
    <div className="shell-backdrop min-h-screen">
      <header className="bg-gradient-to-r from-brand-primary via-brand-primary to-brand-primary-dark text-brand-white shadow-sm">
        <div className={`mx-auto flex ${shellWidth} items-center justify-between px-4 py-4 sm:px-6`}>
          <div className="flex min-w-0 items-center gap-3">
            <AcademyLogo sizeClassName="h-11 w-11 sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <p className="text-xs text-brand-sky">Plataforma de estudio</p>
              <h1 className="truncate text-lg font-bold">Powerful English Academy</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden rounded-lg bg-white/10 px-3 py-1.5 sm:inline">
              {user?.full_name}
            </span>
            <button
              type="button"
              onClick={() => void logout().then(() => (window.location.href = "/login"))}
              className="min-h-11 rounded-lg bg-brand-yellow px-3 font-semibold text-brand-primary-dark transition-transform hover:scale-[1.02]"
            >
              Salir
            </button>
          </div>
        </div>
        {nav.length > 0 && (
          <nav className="border-t border-white/15 bg-brand-primary-dark/25">
            <ul className={`mx-auto flex ${shellWidth} gap-1 overflow-x-auto px-2 py-2 text-sm sm:px-4`}>
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/student" || item.to === "/admin"}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "nav-link-active" : ""}`
                    }
                  >
                    {item.label}
                  </NavLink>
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
