import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import type { UserRole } from "../../lib/types";

interface ProtectedRouteProps {
  roles?: UserRole[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-gray-600">Cargando…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/student"} replace />;
  }

  return <Outlet />;
}
