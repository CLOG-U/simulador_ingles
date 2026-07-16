import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

export function RequireAuth() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p className="p-8 text-center">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
