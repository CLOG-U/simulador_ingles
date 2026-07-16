import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { examApi } from "../../lib/endpoints";
import { useAuth } from "../auth/AuthProvider";

export function StudentDashboard() {
  const { user } = useAuth();
  const { data: config } = useQuery({ queryKey: ["exam-config"], queryFn: examApi.config });
  const { data: status } = useQuery({
    queryKey: ["attempt-status"],
    queryFn: examApi.attemptStatus,
  });

  const hasOpen = status?.has_open_attempt && status.open_attempt_id;
  const canStart = status?.can_start_new ?? true;
  const lastResult = status?.last_submitted;

  return (
    <AppShell title="Panel del estudiante">
      <div className="space-y-6">
        <section className="card">
          <h2 className="text-lg font-semibold">Hola, {user?.full_name}</h2>
          <p className="mt-2 text-gray-600">
            Evaluación de {config?.question_count ?? 20} verbos. Nota mínima:{" "}
            {config?.passing_percentage ?? 70}%.
          </p>

          {hasOpen ? (
            <Link
              to={`/student/exam/${status.open_attempt_id}`}
              className="btn-primary mt-4 inline-flex"
            >
              Reanudar evaluación
            </Link>
          ) : canStart ? (
            <Link to="/student/instructions" className="btn-primary mt-4 inline-flex">
              Iniciar evaluación
            </Link>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Ya completaste tu evaluación ({status?.submitted_count} de{" "}
                {status?.max_attempts} intento(s) permitido(s)). Contacta al profesor si
                necesitas un nuevo intento.
              </p>
              {lastResult && (
                <Link
                  to={`/student/result/${lastResult.id}`}
                  className="btn-primary inline-flex"
                >
                  Ver mi resultado ({lastResult.percentage?.toFixed(1)}%)
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
