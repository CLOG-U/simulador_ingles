import { Link } from "react-router-dom";
import { QueryState } from "../../components/QueryState";
import type { AdminAttemptListItem } from "../../lib/types";

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "En curso",
  SUBMITTED: "Entregado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

export function formatReportDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ModuleAttemptsTable({
  items,
  detailPath,
  emptyMessage,
  showStudent = true,
}: {
  items: AdminAttemptListItem[];
  detailPath: (id: string) => string;
  emptyMessage: string;
  showStudent?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-600">{emptyMessage}</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table min-w-[760px]">
        <thead>
          <tr>
            {showStudent && <th>Estudiante</th>}
            <th>Inicio</th>
            <th>Entrega</th>
            <th>Estado</th>
            <th>Nota</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              {showStudent && (
                <td>
                  <Link
                    to={`/admin/students/${row.student_id}/report`}
                    className="font-semibold text-brand-primary underline"
                  >
                    {row.student_name}
                  </Link>
                  <span className="block text-xs text-gray-500">
                    {row.student_username}
                  </span>
                </td>
              )}
              <td>{formatReportDate(row.started_at)}</td>
              <td>{formatReportDate(row.submitted_at)}</td>
              <td>{STATUS_LABELS[row.status] ?? row.status}</td>
              <td>
                {row.percentage != null ? `${row.percentage.toFixed(1)}%` : "—"}
              </td>
              <td>
                <Link
                  to={detailPath(row.id)}
                  className="btn-admin-primary inline-flex w-auto min-w-[8.5rem] px-4"
                >
                  Ver reporte
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ModuleReportsSection({
  title,
  description,
  isLoading,
  isError,
  error,
  items,
  detailPath,
  emptyMessage,
}: {
  title: string;
  description: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  items: AdminAttemptListItem[];
  detailPath: (id: string) => string;
  emptyMessage: string;
}) {
  return (
    <section className="card">
      <h2 className="mb-1 text-xl font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-gray-600">{description}</p>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
      >
        <ModuleAttemptsTable
          items={items}
          detailPath={detailPath}
          emptyMessage={emptyMessage}
        />
      </QueryState>
    </section>
  );
}
