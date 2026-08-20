import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";

const TOPIC_LABELS: Record<string, string> = {
  interrogative_structure: "Interrogative structure",
  use_of_did: "Use of did",
  regular_irregular_verbs: "Regular and irregular verbs",
  short_answers: "Short answers",
  was_were: "Was and were",
  question_words: "Question Words",
  what: "What",
  where: "Where",
  when: "When",
  why: "Why",
  who: "Who",
  how: "How",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AdminPresentSimplePage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-present-simple-config"],
    queryFn: adminApi.getPresentSimpleConfig,
  });
  const {
    data: questions,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-present-simple-questions"],
    queryFn: adminApi.listPresentSimpleQuestions,
  });
  const [passing, setPassing] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");

  useEffect(() => {
    if (!config) return;
    setPassing(config.passing_percentage);
    setDuration(config.duration_minutes ?? "");
  }, [config]);

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.togglePresentSimpleQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-present-simple-questions"],
      }),
  });

  const saveSettings = async () => {
    await adminApi.updatePresentSimpleConfig({
      passing_percentage:
        passing === "" ? config?.passing_percentage : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    void queryClient.invalidateQueries({ queryKey: ["admin-present-simple-config"] });
  };

  const toggleExam = async () => {
    if (!config) return;
    await adminApi.updatePresentSimpleConfig({ is_enabled: !config.is_enabled });
    void queryClient.invalidateQueries({ queryKey: ["admin-present-simple-config"] });
  };

  const togglePractice = async () => {
    if (!config) return;
    await adminApi.updatePresentSimpleConfig({
      practice_enabled: !config.practice_enabled,
    });
    void queryClient.invalidateQueries({ queryKey: ["admin-present-simple-config"] });
  };

  return (
    <AppShell title="Present Simple Exam" nav={adminNav}>
      <div className="space-y-5">
        <section className="card space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Configuración</h2>
            <p className="text-sm text-gray-600">
              Banco: {config?.question_bank_size ?? "—"} preguntas · Cada sesión
              de examen o práctica toma 14 (2 por tema). Examen y práctica se
              activan por separado.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="admin-panel p-4">
              <p className="admin-panel-title mb-1">Examen oficial</p>
              <p className="text-sm text-gray-600">
                Evaluación calificada. También requiere habilitar al estudiante
                en Usuarios.
              </p>
              <button
                type="button"
                className={`mt-3 ${
                  config?.is_enabled ? "btn-admin-success" : "btn-admin-muted"
                }`}
                disabled={!config}
                onClick={() => void toggleExam()}
              >
                {config?.is_enabled ? "Examen habilitado" : "Examen deshabilitado"}
              </button>
            </div>
            <div className="admin-panel p-4">
              <p className="admin-panel-title mb-1">Práctica</p>
              <p className="text-sm text-gray-600">
                Entrenamiento con feedback. Independiente del examen; también se
                habilita por estudiante en Usuarios.
              </p>
              <button
                type="button"
                className={`mt-3 ${
                  config?.practice_enabled ? "btn-admin-success" : "btn-admin-muted"
                }`}
                disabled={!config}
                onClick={() => void togglePractice()}
              >
                {config?.practice_enabled
                  ? "Práctica habilitada"
                  : "Práctica deshabilitada"}
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Nota mínima (%)
              <input
                type="number"
                value={passing}
                onChange={(event) => setPassing(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label>
              Duración (minutos, vacío = sin límite)
              <input
                type="number"
                value={duration}
                onChange={(event) =>
                  setDuration(event.target.value ? Number(event.target.value) : "")
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={!config}
            onClick={() => void saveSettings()}
          >
            Guardar configuración
          </button>
        </section>

        <section className="card">
          <h2 className="mb-3 text-xl font-semibold">Banco de preguntas</h2>
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!questions?.items.length}
            emptyMessage="No hay preguntas cargadas."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">Tema</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Pregunta</th>
                    <th className="py-2">Respuesta</th>
                    <th className="py-2">Activa</th>
                  </tr>
                </thead>
                <tbody>
                  {questions?.items.map((question) => (
                    <tr key={question.id} className="border-b align-top">
                      <td className="py-2">
                        {TOPIC_LABELS[question.topic] ?? question.topic}
                      </td>
                      <td className="py-2">{question.question_type}</td>
                      <td className="max-w-sm py-2">{question.question}</td>
                      <td className="max-w-xs py-2">{question.correct_answer}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          className="min-h-11 rounded-lg border px-3"
                          onClick={() =>
                            toggleQuestion.mutate({
                              id: question.id,
                              active: !question.active,
                            })
                          }
                        >
                          {question.active ? "Sí" : "No"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
        </section>
      </div>
    </AppShell>
  );
}

export function AdminPresentSimpleAttemptReportPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-present-simple-report", attemptId],
    queryFn: () => adminApi.presentSimpleAttemptReport(attemptId),
    enabled: Boolean(attemptId),
  });

  return (
    <AppShell
      title={
        data?.mode === "practice"
          ? "Reporte Present Simple Practice"
          : "Reporte Present Simple Exam"
      }
      nav={adminNav}
    >
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
                {data.exam_name ??
                  (data.mode === "practice"
                    ? "Present Simple Practice"
                    : "Present Simple Exam")}{" "}
                · {data.mode === "practice" ? "Sesión" : "Intento"}{" "}
                {data.attempt_number}
              </p>
              <p className="text-sm text-gray-600">
                Inicio: {formatDate(data.started_at)} · Entrega:{" "}
                {formatDate(data.submitted_at)}
              </p>
              <p className="text-sm text-gray-600">
                Tiempo utilizado:{" "}
                {data.duration_seconds != null
                  ? `${Math.floor(data.duration_seconds / 60)} min ${data.duration_seconds % 60} s`
                  : "—"}
              </p>
              <p className="text-3xl font-bold text-brand-primary">
                {data.percentage != null
                  ? `${data.percentage.toFixed(1)}% · ${(data.score_out_of_ten ?? 0).toFixed(1)} / 10`
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

            <section className="card">
              <h2 className="mb-3 text-lg font-semibold">Rendimiento por tema</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Tema</th>
                      <th>Correctas</th>
                      <th>Incorrectas</th>
                      <th>Sin responder</th>
                      <th>Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topic_performance.map((topic) => (
                      <tr key={topic.topic} className="border-b">
                        <td className="py-2">{topic.topic_label}</td>
                        <td>{topic.correct}</td>
                        <td>{topic.incorrect}</td>
                        <td>{topic.unanswered}</td>
                        <td>{topic.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-green-50 p-3">
                  <h3 className="font-semibold text-green-800">Temas dominados</h3>
                  <p className="mt-1 text-sm">
                    {data.observation.strong_topics.join(", ") || "Ninguno todavía"}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <h3 className="font-semibold text-amber-900">Temas por reforzar</h3>
                  <p className="mt-1 text-sm">
                    {data.observation.topics_to_review.join(", ") || "Ninguno"}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Detalle de respuestas</h2>
              {data.questions.map((question) => (
                <article key={question.id} className="card text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold">
                      {question.position}. {question.question}
                    </h3>
                    <span className="font-semibold capitalize">
                      {question.status ?? "pendiente"}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600">
                    Tema: {TOPIC_LABELS[question.topic] ?? question.topic}
                  </p>
                  {question.options && (
                    <p className="mt-2 text-gray-600">
                      Opciones: {question.options.join(" · ")}
                    </p>
                  )}
                  <p className="mt-2">
                    Respuesta del estudiante:{" "}
                    <strong>{question.answer || "Sin responder"}</strong>
                  </p>
                  <p>
                    Respuesta correcta:{" "}
                    <strong className="text-success">
                      {question.correct_answer ?? "Disponible al entregar"}
                    </strong>
                  </p>
                  {question.explanation && (
                    <p className="mt-2 rounded-lg bg-gray-50 p-3">
                      {question.explanation}
                    </p>
                  )}
                </article>
              ))}
            </section>

            <div className="flex flex-wrap gap-3">
              <Link
                to={`/admin/students/${data.student_id}/report`}
                className="btn-primary"
              >
                Reporte general
              </Link>
              <Link
                to={
                  data.mode === "practice"
                    ? `/admin/students/${data.student_id}/practice/present-simple`
                    : `/admin/students/${data.student_id}/exams/present-simple`
                }
                className="inline-flex rounded-xl border px-4 py-2.5"
              >
                {data.mode === "practice"
                  ? "Reporte Practice"
                  : "Reporte Present Simple Exam"}
              </Link>
              <Link
                to={
                  data.mode === "practice"
                    ? "/admin/practice/present-simple"
                    : "/admin/exams/present-simple"
                }
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
