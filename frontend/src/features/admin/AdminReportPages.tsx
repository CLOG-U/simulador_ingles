import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";
import type { AdminAttemptReport, ExamQuestion } from "../../lib/types";
import {
  AttemptReportHeader,
  GradeOverrideButtons,
  formatReportDate,
} from "./AdminAttemptReportLayout";

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "En curso",
  SUBMITTED: "Entregado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

function formatDate(iso: string | null | undefined) {
  return formatReportDate(iso);
}

function answerKey(field: string): "base" | "past" | "spanish" {
  return field.toLowerCase() as "base" | "past" | "spanish";
}

function studentAnswer(
  answers: ExamQuestion["answers"],
  key: "base" | "past" | "spanish",
) {
  return (answers[key] ?? "").trim() || "—";
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
  attemptId,
}: {
  questions: ExamQuestion[];
  graded: boolean;
  attemptId: string;
}) {
  const queryClient = useQueryClient();
  const overrideMutation = useMutation({
    mutationFn: ({
      questionId,
      field,
      correct,
    }: {
      questionId: string;
      field: string;
      correct: boolean;
    }) => adminApi.overrideVerbExamGrade(attemptId, questionId, { field, correct }),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-attempt-report", attemptId], data);
    },
  });

  if (questions.length === 0) return null;

  return (
    <div className="space-y-3 pt-4">
      <h3 className="font-semibold">Revisión por pregunta</h3>
      <p className="text-sm text-gray-600">
        Puedes corregir un campo si la respuesta del estudiante es válida y el
        sistema no la reconoció. El porcentaje se recalcula al instante.
      </p>
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
                const studentAnswerText = studentAnswer(q.answers, key);
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
                      <strong>{studentAnswerText}</strong>
                    </p>
                    {hasGrades && (
                      <p className="mt-1">
                        <span className="text-gray-600">Respuesta correcta:</span>{" "}
                        <strong className="text-green-800">{expectedAnswer}</strong>
                      </p>
                    )}
                    {hasGrades && (
                      <GradeOverrideButtons
                        current={isCorrect}
                        disabled={overrideMutation.isPending}
                        onSet={(correct) =>
                          overrideMutation.mutate({
                            questionId: q.id,
                            field,
                            correct,
                          })
                        }
                      />
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
    <div className="space-y-5">
      <AttemptReportHeader
        studentName={data.student_name}
        studentUsername={data.student_username}
        studentId={data.student_id}
        examName={data.exam_name ?? "Verb Exam"}
        attemptLabel={
          data.attempt_number != null ? `Intento ${data.attempt_number}` : undefined
        }
        startedAt={data.started_at}
        submittedAt={data.submitted_at}
        durationSeconds={data.duration_seconds}
        status={data.status}
        percentage={data.percentage}
        scoreOutOfTen={data.score_out_of_ten}
        passed={data.passed}
        correct={data.correct_answers ?? data.correct_fields}
        incorrect={data.incorrect_answers}
        unanswered={data.unanswered_answers}
        correctLabel="Campos correctos"
      />

      {data.questions && data.questions.length > 0 && (
        <QuestionReview
          questions={data.questions}
          graded={submitted}
          attemptId={data.id}
        />
      )}
    </div>
  );
}

function ModuleReportCard({
  title,
  summary,
  to,
  tone = "exam",
}: {
  title: string;
  summary: string;
  to: string;
  tone?: "exam" | "practice";
}) {
  const toneClass =
    tone === "practice"
      ? "border-brand-sky/30 from-brand-sky/10"
      : "border-brand-primary/20 from-brand-primary/[0.06]";

  return (
    <section
      className={`card flex h-full flex-col border bg-gradient-to-br to-white ${toneClass}`}
    >
      <h3 className="text-lg font-semibold text-brand-primary-dark">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-gray-600">{summary}</p>
      <Link to={to} className="btn-primary mt-4">
        Abrir reporte
      </Link>
    </section>
  );
}

/** Reporte general del estudiante: resumen + acceso a reportes por módulo. */
export function AdminStudentReportPage() {
  const { userId = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-student-report", userId],
    queryFn: () => adminApi.studentReport(userId),
    enabled: Boolean(userId),
  });

  return (
    <AppShell title="Reporte general" nav={adminNav} wide>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
      >
        {data && (
          <div className="space-y-5">
            <Link
              to="/admin/results"
              className="inline-flex min-h-11 items-center rounded-xl border border-brand-primary/20 bg-white px-4 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary/5"
            >
              ← Volver a reporte general
            </Link>

            <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
              <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-white/80">
                  Reporte general del estudiante
                </p>
                <h2 className="mt-1 text-xl font-bold">{data.student.full_name}</h2>
                <p className="mt-1 text-sm text-brand-white/90">
                  Usuario: {data.student.username}
                </p>
              </div>
              <div className="grid gap-3 px-6 py-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <p>
                  <span className="font-semibold text-brand-primary">Verb Exam:</span>{" "}
                  {data.student.attempts_used ?? 0} de{" "}
                  {data.student.attempts_max ?? "—"} usados
                  {data.student.has_open_attempt ? " · en curso" : ""}
                </p>
                <p>
                  <span className="font-semibold text-brand-primary">
                    Verb Base Form:
                  </span>{" "}
                  {data.verb_base_attempts?.length ?? 0} intento(s)
                </p>
                <p>
                  <span className="font-semibold text-brand-primary">
                    Past Simple Exam:
                  </span>{" "}
                  {data.past_simple_attempts.length} intento(s)
                </p>
                <p>
                  <span className="font-semibold text-brand-primary">
                    Present Simple Exam:
                  </span>{" "}
                  {data.present_simple_attempts?.length ?? 0} intento(s)
                </p>
                <p>
                  <span className="font-semibold text-brand-primary">
                    Present Perfect Exam:
                  </span>{" "}
                  {data.present_perfect_attempts?.length ?? 0} intento(s)
                </p>
                <p>
                  <span className="font-semibold text-brand-primary">
                    Listening Exam:
                  </span>{" "}
                  {data.listening_exam_attempts?.length ?? 0} intento(s)
                </p>
                <p>
                  <span className="font-semibold text-brand-primary">Práctica:</span>{" "}
                  {data.practice_sessions_completed ??
                    data.past_simple_practice_attempts?.filter(
                      (item) => item.status === "SUBMITTED",
                    ).length ??
                    0}{" "}
                  sesión(es)
                </p>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-lg font-semibold">Reportes por módulo</h3>
              <p className="mb-4 text-sm text-gray-600">
                Entra al reporte específico de cada examen o práctica.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <ModuleReportCard
                  title="Verb Exam"
                  summary={`${data.attempts.length} intento(s) · ${data.student.attempts_remaining ?? 0} pendiente(s)`}
                  to={`/admin/students/${userId}/exams/verb`}
                />
                <ModuleReportCard
                  title="Verb Base Form"
                  summary={`${data.verb_base_attempts?.length ?? 0} intento(s) registrados`}
                  to={`/admin/students/${userId}/exams/verb-base`}
                />
                <ModuleReportCard
                  title="Past Simple Exam"
                  summary={`${data.past_simple_attempts.length} intento(s) registrados`}
                  to={`/admin/students/${userId}/exams/past-simple`}
                />
                <ModuleReportCard
                  title="Present Simple Exam"
                  summary={`${data.present_simple_attempts?.length ?? 0} intento(s) registrados`}
                  to={`/admin/students/${userId}/exams/present-simple`}
                />
                <ModuleReportCard
                  title="Present Perfect Exam"
                  summary={`${data.present_perfect_attempts?.length ?? 0} intento(s) registrados`}
                  to={`/admin/students/${userId}/exams/present-perfect`}
                />
                <ModuleReportCard
                  title="Listening Exam"
                  summary={`${data.listening_exam_attempts?.length ?? 0} intento(s) registrados`}
                  to={`/admin/students/${userId}/exams/listening`}
                />
                <ModuleReportCard
                  title="Verb Base Form Practice"
                  summary={`${data.verb_base_practice_attempts?.length ?? 0} sesión(es) registradas`}
                  to={`/admin/students/${userId}/practice/verb-base`}
                  tone="practice"
                />
                <ModuleReportCard
                  title="Verb Past Form Practice"
                  summary={`${data.verb_past_practice_attempts?.length ?? 0} sesión(es) registradas`}
                  to={`/admin/students/${userId}/practice/verb-past`}
                  tone="practice"
                />
                <ModuleReportCard
                  title="Past Simple Practice"
                  summary={`${data.past_simple_practice_attempts?.length ?? 0} sesión(es) registradas`}
                  to={`/admin/students/${userId}/practice/past-simple`}
                  tone="practice"
                />
                <ModuleReportCard
                  title="Present Simple Practice"
                  summary={`${data.present_simple_practice_attempts?.length ?? 0} sesión(es) registradas`}
                  to={`/admin/students/${userId}/practice/present-simple`}
                  tone="practice"
                />
                <ModuleReportCard
                  title="Present Perfect Practice"
                  summary={`${data.present_perfect_practice_attempts?.length ?? 0} sesión(es) registradas`}
                  to={`/admin/students/${userId}/practice/present-perfect`}
                  tone="practice"
                />
                <ModuleReportCard
                  title="Listening Practice"
                  summary={`${data.listening_practice_attempts?.length ?? 0} sesión(es) registradas`}
                  to={`/admin/students/${userId}/practice/listening`}
                  tone="practice"
                />
              </div>
            </section>
          </div>
        )}
      </QueryState>
    </AppShell>
  );
}

type StudentModuleKey =
  | "verb"
  | "verb-base"
  | "verb-base-practice"
  | "verb-past-practice"
  | "past-simple-exam"
  | "present-simple-exam"
  | "present-perfect-exam"
  | "listening-exam"
  | "past-simple-practice"
  | "present-simple-practice"
  | "present-perfect-practice"
  | "listening-practice";

/** Reporte específico de un módulo para un estudiante. */
export function AdminStudentModuleReportPage({
  module,
}: {
  module: StudentModuleKey;
}) {
  const { userId = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-student-report", userId],
    queryFn: () => adminApi.studentReport(userId),
    enabled: Boolean(userId),
  });

  const titles: Record<StudentModuleKey, string> = {
    verb: "Reporte Verb Exam",
    "verb-base": "Reporte Verb Base Form",
    "verb-base-practice": "Reporte Verb Base Form Practice",
    "verb-past-practice": "Reporte Verb Past Form Practice",
    "past-simple-exam": "Reporte Past Simple Exam",
    "present-simple-exam": "Reporte Present Simple Exam",
    "present-perfect-exam": "Reporte Present Perfect Exam",
    "listening-exam": "Reporte Listening Exam",
    "past-simple-practice": "Reporte Past Simple Practice",
    "present-simple-practice": "Reporte Present Simple Practice",
    "present-perfect-practice": "Reporte Present Perfect Practice",
    "listening-practice": "Reporte Listening Practice",
  };
  const backModule: Record<StudentModuleKey, string> = {
    verb: "/admin/exams/verb",
    "verb-base": "/admin/exams/verb-base",
    "verb-base-practice": "/admin/practice/verb-base",
    "verb-past-practice": "/admin/practice/verb-past",
    "past-simple-exam": "/admin/exams/past-simple",
    "present-simple-exam": "/admin/exams/present-simple",
    "present-perfect-exam": "/admin/exams/present-perfect",
    "listening-exam": "/admin/exams/listening",
    "past-simple-practice": "/admin/practice/past-simple",
    "present-simple-practice": "/admin/practice/present-simple",
    "present-perfect-practice": "/admin/practice/present-perfect",
    "listening-practice": "/admin/practice/listening",
  };

  return (
    <AppShell title={titles[module]} nav={adminNav} wide>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
      >
        {data && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/admin/students/${userId}/report`}
                className="inline-flex min-h-11 items-center rounded-xl border border-brand-primary/20 bg-white px-4 text-sm font-semibold text-brand-primary"
              >
                ← Reporte general
              </Link>
              <Link
                to={backModule[module]}
                className="inline-flex min-h-11 items-center rounded-xl border border-brand-primary/20 bg-white px-4 text-sm font-semibold text-brand-primary"
              >
                Ir al módulo
              </Link>
            </div>

            <section className="card space-y-1">
              <h2 className="text-xl font-bold">{data.student.full_name}</h2>
              <p className="text-sm text-gray-600">
                Usuario: {data.student.username} · {titles[module]}
              </p>
            </section>

            {module === "verb" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">Historial de Verb Exam</h3>
                {data.attempts.length === 0 ? (
                  <p className="text-sm text-gray-600">Sin intentos todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attempts.map((a) => (
                          <tr key={a.id} className="border-b">
                            <td className="py-2">{formatDate(a.started_at)}</td>
                            <td className="py-2">{formatDate(a.submitted_at)}</td>
                            <td className="py-2">
                              {STATUS_LABELS[a.status] ?? a.status}
                            </td>
                            <td className="py-2">
                              {a.percentage != null
                                ? `${a.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/exams/verb/reports/${a.id}`}
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
                )}
              </section>
            )}

            {module === "verb-base" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Verb Base Form
                </h3>
                {(data.verb_base_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">
                    Sin intentos todavía. Consulta también el listado del módulo.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.verb_base_attempts?.map((a) => (
                          <tr key={a.id} className="border-b">
                            <td className="py-2">{formatDate(a.started_at)}</td>
                            <td className="py-2">{formatDate(a.submitted_at)}</td>
                            <td className="py-2">
                              {STATUS_LABELS[a.status] ?? a.status}
                            </td>
                            <td className="py-2">
                              {a.percentage != null
                                ? `${a.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/exams/verb-base/reports/${a.id}`}
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
                )}
              </section>
            )}

            {module === "verb-past-practice" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Verb Past Form Practice
                </h3>
                {(data.verb_past_practice_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">Sin sesiones todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.verb_past_practice_attempts?.map((a) => (
                          <tr key={a.id} className="border-b">
                            <td className="py-2">{formatDate(a.started_at)}</td>
                            <td className="py-2">{formatDate(a.submitted_at)}</td>
                            <td className="py-2">
                              {STATUS_LABELS[a.status] ?? a.status}
                            </td>
                            <td className="py-2">
                              {a.percentage != null
                                ? `${a.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/practice/verb-past/reports/${a.id}`}
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
                )}
              </section>
            )}

            {module === "verb-base-practice" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Verb Base Form Practice
                </h3>
                {(data.verb_base_practice_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">Sin sesiones todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.verb_base_practice_attempts?.map((a) => (
                          <tr key={a.id} className="border-b">
                            <td className="py-2">{formatDate(a.started_at)}</td>
                            <td className="py-2">{formatDate(a.submitted_at)}</td>
                            <td className="py-2">
                              {STATUS_LABELS[a.status] ?? a.status}
                            </td>
                            <td className="py-2">
                              {a.percentage != null
                                ? `${a.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/practice/verb-base/reports/${a.id}`}
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
                )}
              </section>
            )}

            {module === "past-simple-exam" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Past Simple Exam
                </h3>
                {data.past_simple_attempts.length === 0 ? (
                  <p className="text-sm text-gray-600">Sin intentos todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Intento</th>
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.past_simple_attempts.map((attempt) => (
                          <tr key={attempt.id} className="border-b">
                            <td className="py-2">#{attempt.attempt_number}</td>
                            <td className="py-2">
                              {formatDate(attempt.started_at)}
                            </td>
                            <td className="py-2">
                              {formatDate(attempt.submitted_at)}
                            </td>
                            <td className="py-2">
                              {STATUS_LABELS[attempt.status] ?? attempt.status}
                            </td>
                            <td className="py-2">
                              {attempt.percentage != null
                                ? `${attempt.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/exams/past-simple/reports/${attempt.id}`}
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
                )}
              </section>
            )}

            {module === "present-simple-exam" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Present Simple Exam
                </h3>
                {(data.present_simple_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">
                    Sin intentos todavía. Consulta también el listado del módulo.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Intento</th>
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.present_simple_attempts?.map((attempt) => (
                          <tr key={attempt.id} className="border-b">
                            <td className="py-2">#{attempt.attempt_number}</td>
                            <td className="py-2">
                              {formatDate(attempt.started_at)}
                            </td>
                            <td className="py-2">
                              {formatDate(attempt.submitted_at)}
                            </td>
                            <td className="py-2">
                              {STATUS_LABELS[attempt.status] ?? attempt.status}
                            </td>
                            <td className="py-2">
                              {attempt.percentage != null
                                ? `${attempt.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/exams/present-simple/reports/${attempt.id}`}
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
                )}
              </section>
            )}

            {module === "present-perfect-exam" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Present Perfect Exam
                </h3>
                {(data.present_perfect_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">
                    Sin intentos todavía. Consulta también el listado del módulo.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Intento</th>
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.present_perfect_attempts?.map((attempt) => (
                          <tr key={attempt.id} className="border-b">
                            <td className="py-2">#{attempt.attempt_number}</td>
                            <td className="py-2">
                              {formatDate(attempt.started_at)}
                            </td>
                            <td className="py-2">
                              {formatDate(attempt.submitted_at)}
                            </td>
                            <td className="py-2">
                              {STATUS_LABELS[attempt.status] ?? attempt.status}
                            </td>
                            <td className="py-2">
                              {attempt.percentage != null
                                ? `${attempt.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/exams/present-perfect/reports/${attempt.id}`}
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
                )}
              </section>
            )}

            {module === "listening-exam" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Listening Exam
                </h3>
                {(data.listening_exam_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">
                    Sin intentos todavía. Consulta también el listado del módulo.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Intento</th>
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.listening_exam_attempts?.map((attempt) => (
                          <tr key={attempt.id} className="border-b">
                            <td className="py-2">#{attempt.attempt_number}</td>
                            <td className="py-2">
                              {formatDate(attempt.started_at)}
                            </td>
                            <td className="py-2">
                              {formatDate(attempt.submitted_at)}
                            </td>
                            <td className="py-2">
                              {STATUS_LABELS[attempt.status] ?? attempt.status}
                            </td>
                            <td className="py-2">
                              {attempt.percentage != null
                                ? `${attempt.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/exams/listening/reports/${attempt.id}`}
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
                )}
              </section>
            )}

            {module === "past-simple-practice" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Past Simple Practice
                </h3>
                {(data.past_simple_practice_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">Sin sesiones todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Sesión</th>
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.past_simple_practice_attempts?.map((attempt) => (
                          <tr key={attempt.id} className="border-b">
                            <td className="py-2">#{attempt.attempt_number}</td>
                            <td className="py-2">
                              {formatDate(attempt.started_at)}
                            </td>
                            <td className="py-2">
                              {formatDate(attempt.submitted_at)}
                            </td>
                            <td className="py-2">
                              {STATUS_LABELS[attempt.status] ?? attempt.status}
                            </td>
                            <td className="py-2">
                              {attempt.percentage != null
                                ? `${attempt.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/practice/past-simple/reports/${attempt.id}`}
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
                )}
              </section>
            )}

            {module === "present-simple-practice" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Present Simple Practice
                </h3>
                {(data.present_simple_practice_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">Sin sesiones todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Sesión</th>
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.present_simple_practice_attempts?.map((attempt) => (
                          <tr key={attempt.id} className="border-b">
                            <td className="py-2">#{attempt.attempt_number}</td>
                            <td className="py-2">
                              {formatDate(attempt.started_at)}
                            </td>
                            <td className="py-2">
                              {formatDate(attempt.submitted_at)}
                            </td>
                            <td className="py-2">
                              {STATUS_LABELS[attempt.status] ?? attempt.status}
                            </td>
                            <td className="py-2">
                              {attempt.percentage != null
                                ? `${attempt.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/practice/present-simple/reports/${attempt.id}`}
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
                )}
              </section>
            )}

            {module === "present-perfect-practice" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Present Perfect Practice
                </h3>
                {(data.present_perfect_practice_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">Sin sesiones todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Sesión</th>
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.present_perfect_practice_attempts?.map((attempt) => (
                          <tr key={attempt.id} className="border-b">
                            <td className="py-2">#{attempt.attempt_number}</td>
                            <td className="py-2">
                              {formatDate(attempt.started_at)}
                            </td>
                            <td className="py-2">
                              {formatDate(attempt.submitted_at)}
                            </td>
                            <td className="py-2">
                              {STATUS_LABELS[attempt.status] ?? attempt.status}
                            </td>
                            <td className="py-2">
                              {attempt.percentage != null
                                ? `${attempt.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/practice/present-perfect/reports/${attempt.id}`}
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
                )}
              </section>
            )}

            {module === "listening-practice" && (
              <section className="card">
                <h3 className="mb-3 font-semibold">
                  Historial de Listening Practice
                </h3>
                {(data.listening_practice_attempts?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-600">Sin sesiones todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Sesión</th>
                          <th className="py-2">Inicio</th>
                          <th className="py-2">Entrega</th>
                          <th className="py-2">Estado</th>
                          <th className="py-2">Nota</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.listening_practice_attempts?.map((attempt) => (
                          <tr key={attempt.id} className="border-b">
                            <td className="py-2">#{attempt.attempt_number}</td>
                            <td className="py-2">
                              {formatDate(attempt.started_at)}
                            </td>
                            <td className="py-2">
                              {formatDate(attempt.submitted_at)}
                            </td>
                            <td className="py-2">
                              {STATUS_LABELS[attempt.status] ?? attempt.status}
                            </td>
                            <td className="py-2">
                              {attempt.percentage != null
                                ? `${attempt.percentage.toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-2">
                              <Link
                                to={`/admin/practice/listening/reports/${attempt.id}`}
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
                )}
              </section>
            )}
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
                Reporte general
              </Link>
              <Link
                to={`/admin/students/${data.student_id}/exams/verb`}
                className="inline-flex rounded-xl border px-4 py-2"
              >
                Reporte Verb Exam
              </Link>
              <Link
                to="/admin/exams/verb"
                className="inline-flex rounded-xl border px-4 py-2"
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
