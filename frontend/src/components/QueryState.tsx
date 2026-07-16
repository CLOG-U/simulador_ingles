import type { ReactNode } from "react";
import { ApiError } from "../lib/api";

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty = false,
  emptyMessage = "No hay registros.",
  children,
}: QueryStateProps) {
  if (isLoading) {
    return <p>Cargando…</p>;
  }

  if (isError) {
    const apiError = error instanceof ApiError ? error : null;
    const message = apiError?.message ?? "No se pudieron cargar los datos.";
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
        <p>{message}</p>
        {apiError?.code === "FORBIDDEN" && (
          <p className="mt-2 text-gray-700">
            Puede que otra pestaña haya iniciado sesión con otro usuario. Cierra sesión e
            ingresa de nuevo con la cuenta correcta, o usa ventanas privadas separadas para
            profesor y estudiante.
          </p>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <p className="text-gray-600">{emptyMessage}</p>;
  }

  return <>{children}</>;
}
