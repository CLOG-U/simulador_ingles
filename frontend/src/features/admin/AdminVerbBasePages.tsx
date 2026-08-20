import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AdminVerbBaseAttemptReportPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-verb-base-report", attemptId],
    queryFn: () => adminApi.verbBaseAttemptReport(attemptId),
    enabled: Boolean(attemptId),
  });

  return (
    <AppShell title="Reporte Verb Base Form" nav={adminNav}>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
      >
        {data && (
          <div className="space-y-5">
            <section className="card space-y-3">
              <h2 className="text-xl font-semibold">
                {data.student_name} ({data.student_username})
              </h2>
              <p className="text-sm text-gray-600">
                {data.exam_name ?? "Verb Base Form"}
                {data.attempt_number != null
                  ? ` · Intento ${data.attempt_number}`
                  : ""}
              </p>
              <p className="text-sm text-gray-600">
                Inicio: {formatDate(data.started_at)} · Entrega:{" "}
                {formatDate(data.submitted_at)}
              </p>
              <p className="text-3xl font-bold text-brand-primary">
                {data.percentage != null
                  ? `${data.percentage.toFixed(1)}%`
                  : "Evaluación en curso"}
              </p>
              <p className="font-semibold">
                {data.passed == null
                  ? "Pendiente de entrega"
                  : data.passed
                    ? "Aprobado"
                    : "No aprobado"}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <p>Correctas: {data.correct_answers ?? "—"}</p>
                <p>Incorrectas: {data.incorrect_answers ?? "—"}</p>
                <p>Sin responder: {data.unanswered_answers ?? "—"}</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Detalle de respuestas</h2>
              {data.questions.map((question) => (
                <article key={question.id} className="card text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold">
                      {question.position}. {question.prompt_label}:{" "}
                      {question.shown_value}
                    </h3>
                    {question.grades?.base != null && (
                      <span
                        className={
                          question.grades.base ? "text-success" : "text-danger"
                        }
                      >
                        {question.grades.base ? "Correcto" : "Incorrecto"}
                      </span>
                    )}
                  </div>
                  <p className="mt-2">
                    Respuesta del estudiante:{" "}
                    <strong>{question.answers.base || "Sin responder"}</strong>
                  </p>
                  {question.expected?.base && (
                    <p>
                      Respuesta correcta:{" "}
                      <strong className="text-success">
                        {question.expected.base}
                      </strong>
                    </p>
                  )}
                </article>
              ))}
            </section>

            <div className="flex flex-wrap gap-3">
              {data.student_id && (
                <Link
                  to={`/admin/students/${data.student_id}/report`}
                  className="btn-primary"
                >
                  Reporte general
                </Link>
              )}
              <Link
                to="/admin/exams/verb-base"
                className="inline-flex rounded-xl border px-4 py-2.5"
              >
                Volver al módulo
              </Link>
            </div>
          </div>
        )}
      </QueryState>
    </AppShell>
  );
}
