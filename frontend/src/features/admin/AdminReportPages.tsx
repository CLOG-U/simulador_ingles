import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";
import type { AdminAttemptReport, ExamQuestion } from "../../lib/types";

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "En curso",
  SUBMITTED: "Entregado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function answerKey(field: string): "base" | "past" | "spanish" {
  return field.toLowerCase() as "base" | "past" | "spanish";
}

function GradeBadge({ correct }: { correct: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        correct ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {correct ? "Correcto" : "Incorrecto"}
    </span>
  );
}

function QuestionReview({
  questions,
  graded,
}: {
  questions: ExamQuestion[];
  graded: boolean;
}) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-3 pt-4">
      <h3 className="font-semibold">Revisión por pregunta</h3>
      {questions.map((q) => {
        const hasGrades = graded && q.grades && q.expected;
        const fullyCorrect =
          q.fully_correct ??
          (hasGrades
            ? q.required_fields.every(({ field }) => q.grades?.[answerKey(field)] === true)
            : false);

        return (
          <article
            key={q.id}
            className={`rounded-lg border p-3 text-sm ${
              hasGrades
                ? fullyCorrect
                  ? "border-green-200 bg-green-50/40"
                  : "border-red-200 bg-red-50/40"
                : ""
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium">
                {q.position}. {q.prompt_label}: {q.shown_value}
              </p>
              {hasGrades && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    fullyCorrect
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {fullyCorrect ? "Verbo completo" : "Verbo con errores"}
                </span>
              )}
            </div>

            <ul className="mt-3 space-y-2">
              {q.required_fields.map(({ field, label }) => {
                const key = answerKey(field);
                const studentAnswer = q.answers[key]?.trim() || "—";
                const expectedAnswer = q.expected?.[key] ?? "—";
                const isCorrect = q.grades?.[key];

                return (
                  <li
                    key={field}
                    className={`rounded-lg border bg-white p-2 ${
                      hasGrades && isCorrect === true
                        ? "border-green-200"
                        : hasGrades && isCorrect === false
                          ? "border-red-200"
                          : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium capitalize">{label}</p>
                      {hasGrades && isCorrect != null && <GradeBadge correct={isCorrect} />}
                    </div>
                    <p className="mt-1">
                      <span className="text-gray-600">Respuesta del estudiante:</span>{" "}
                      <strong>{studentAnswer}</strong>
                    </p>
                    {hasGrades && (
                      <p className="mt-1">
                        <span className="text-gray-600">Respuesta correcta:</span>{" "}
                        <strong className="text-green-800">{expectedAnswer}</strong>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

function AttemptReportContent({ data }: { data: AdminAttemptReport }) {
  const submitted = data.status === "SUBMITTED";

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-gray-600">
            Estudiante:{" "}
            <Link
              to={`/admin/students/${data.student_id}/report`}
              className="text-brand-primary underline"
            >
              {data.student_name} ({data.student_username})
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            Inicio: {formatDate(data.started_at)} · Entrega: {formatDate(data.submitted_at)}
          </p>
          <p className="text-sm text-gray-600">
            Estado: {STATUS_LABELS[data.status] ?? data.status}
          </p>
        </div>
      </div>

      {submitted ? (
        <>
          <h2 className="text-xl font-bold">{data.passed ? "Aprobado" : "No aprobado"}</h2>
          <p className="text-3xl font-bold text-brand-primary">
            {data.percentage != null ? `${data.percentage.toFixed(1)}%` : "—"}
          </p>
          <p>
            Campos correctos: {data.correct_fields ?? 0} de {data.total_fields ?? 0}
          </p>
          <p>
            Verbos completamente correctos: {data.fully_correct_questions ?? 0} de{" "}
            {data.total_fields ? data.total_fields / 2 : "—"}
          </p>
        </>
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Este intento aún no ha sido entregado. Se muestran las respuestas registradas hasta el
          momento.
        </p>
      )}

      {data.questions && data.questions.length > 0 && (
        <QuestionReview questions={data.questions} graded={submitted} />
      )}
    </section>
  );
}

export function AdminStudentReportPage() {
  const { userId = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-student-report", userId],
    queryFn: () => adminApi.studentReport(userId),
    enabled: Boolean(userId),
  });

  return (
    <AppShell title="Reporte del estudiante" nav={adminNav}>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
      >
        {data && (
          <div className="space-y-4">
            <section className="card space-y-2">
              <h2 className="text-xl font-bold">{data.student.full_name}</h2>
              <p className="text-sm text-gray-600">Usuario: {data.student.username}</p>
              <p className="text-sm">
                Intentos: {data.student.attempts_used ?? 0} de {data.student.attempts_max ?? "—"}{" "}
                usados · {data.student.attempts_remaining ?? "—"} restante(s)
                {data.student.has_open_attempt ? " · examen en curso" : ""}
              </p>
            </section>

            <section className="card">
              <h3 className="mb-3 font-semibold">Historial de evaluaciones</h3>
              {data.attempts.length === 0 ? (
                <p className="text-sm text-gray-600">Este estudiante aún no tiene intentos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2">Fecha inicio</th>
                        <th className="py-2">Entrega</th>
                        <th className="py-2">Estado</th>
                        <th className="py-2">Nota</th>
                        <th className="py-2">Aprobado</th>
                        <th className="py-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attempts.map((a) => (
                        <tr key={a.id} className="border-b">
                          <td className="py-2">{formatDate(a.started_at)}</td>
                          <td className="py-2">{formatDate(a.submitted_at)}</td>
                          <td className="py-2">{STATUS_LABELS[a.status] ?? a.status}</td>
                          <td className="py-2">
                            {a.percentage != null ? `${a.percentage.toFixed(1)}%` : "—"}
                          </td>
                          <td className="py-2">
                            {a.status === "SUBMITTED" ? (a.passed ? "Sí" : "No") : "—"}
                          </td>
                          <td className="py-2">
                            <Link
                              to={`/admin/reports/${a.id}`}
                              className="text-brand-primary underline"
                            >
                              Ver evaluación
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <Link to="/admin/users" className="btn-primary inline-flex">
              Volver a usuarios
            </Link>
          </div>
        )}
      </QueryState>
    </AppShell>
  );
}

export function AdminAttemptReportPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-attempt-report", attemptId],
    queryFn: () => adminApi.attemptReport(attemptId),
    enabled: Boolean(attemptId),
  });

  return (
    <AppShell title="Evaluación del estudiante" nav={adminNav}>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
      >
        {data && (
          <div className="space-y-4">
            <AttemptReportContent data={data} />
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/admin/students/${data.student_id}/report`}
                className="btn-primary inline-flex"
              >
                Reporte del estudiante
              </Link>
              <Link to="/admin/results" className="inline-flex rounded-xl border px-4 py-2">
                Volver a resultados
              </Link>
            </div>
          </div>
        )}
      </QueryState>
    </AppShell>
  );
}
