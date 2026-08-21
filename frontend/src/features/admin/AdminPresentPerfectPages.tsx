import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";
import {
  AttemptReportFooter,
  AttemptReportHeader,
  GradeOverrideButtons,
  QuestionReviewCard,
  QuestionReviewSection,
  ReportStatusBadge,
  TopicPerformanceCard,
} from "./AdminAttemptReportLayout";

const TOPIC_LABELS: Record<string, string> = {
  affirmative: "Affirmative",
  negative: "Negative",
  interrogative: "Interrogative",
  short_answers: "Short answers",
  identify: "Identify",
  order_words: "Order",
  sentences: "Sentences",
};

export function AdminPresentPerfectPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-present-perfect-config"],
    queryFn: adminApi.getPresentPerfectConfig,
  });
  const {
    data: questions,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-present-perfect-questions"],
    queryFn: adminApi.listPresentPerfectQuestions,
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
      adminApi.togglePresentPerfectQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-present-perfect-questions"],
      }),
  });

  const saveSettings = async () => {
    await adminApi.updatePresentPerfectConfig({
      passing_percentage:
        passing === "" ? config?.passing_percentage : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    void queryClient.invalidateQueries({ queryKey: ["admin-present-perfect-config"] });
  };

  const toggleExam = async () => {
    if (!config) return;
    await adminApi.updatePresentPerfectConfig({ is_enabled: !config.is_enabled });
    void queryClient.invalidateQueries({ queryKey: ["admin-present-perfect-config"] });
  };

  const togglePractice = async () => {
    if (!config) return;
    await adminApi.updatePresentPerfectConfig({
      practice_enabled: !config.practice_enabled,
    });
    void queryClient.invalidateQueries({ queryKey: ["admin-present-perfect-config"] });
  };

  return (
    <AppShell title="Present Perfect Exam" nav={adminNav}>
      <div className="space-y-5">
        <section className="card space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Configuración</h2>
            <p className="text-sm text-gray-600">
              Banco: {config?.question_bank_size ?? "—"} preguntas · Cada sesión
              de examen o práctica toma 20. Examen y práctica se
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

export function AdminPresentPerfectAttemptReportPage() {
  const { attemptId = "" } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-present-perfect-report", attemptId],
    queryFn: () => adminApi.presentPerfectAttemptReport(attemptId),
    enabled: Boolean(attemptId),
  });

  const overrideMutation = useMutation({
    mutationFn: ({
      questionId,
      correct,
    }: {
      questionId: string;
      correct: boolean;
    }) => adminApi.overridePresentPerfectGrade(attemptId, questionId, correct),
    onSuccess: (next) => {
      queryClient.setQueryData(["admin-present-perfect-report", attemptId], next);
    },
  });

  return (
    <AppShell
      title={
        data?.mode === "practice"
          ? "Reporte Present Perfect Practice"
          : "Reporte Present Perfect Exam"
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
            <AttemptReportHeader
              studentName={data.student_name}
              studentUsername={data.student_username}
              studentId={data.student_id}
              examName={
                data.exam_name ??
                (data.mode === "practice"
                  ? "Present Perfect Practice"
                  : "Present Perfect Exam")
              }
              attemptLabel={`${data.mode === "practice" ? "Sesión" : "Intento"} ${data.attempt_number}`}
              startedAt={data.started_at}
              submittedAt={data.submitted_at}
              durationSeconds={data.duration_seconds}
              status={data.status}
              percentage={data.percentage}
              scoreOutOfTen={data.score_out_of_ten}
              passed={data.passed}
              correct={data.correct_answers}
              incorrect={data.incorrect_answers}
              unanswered={data.unanswered_answers}
            />

            <TopicPerformanceCard
              rows={data.topic_performance}
              strongTopics={data.observation.strong_topics}
              topicsToReview={data.observation.topics_to_review}
            />

            <QuestionReviewSection>
              {data.questions.map((question) => (
                <QuestionReviewCard
                  key={question.id}
                  title={`${question.position}. ${question.question}`}
                  badge={
                    <ReportStatusBadge
                      correct={question.is_correct}
                      label={question.status}
                    />
                  }
                  meta={
                    <>
                      <p className="text-gray-600">
                        Tema: {TOPIC_LABELS[question.topic] ?? question.topic}
                      </p>
                      {question.options && (
                        <p className="text-gray-600">
                          Opciones: {question.options.join(" · ")}
                        </p>
                      )}
                    </>
                  }
                  studentAnswer={question.answer || "Sin responder"}
                  expectedAnswer={
                    question.correct_answer ?? "Disponible al entregar"
                  }
                  explanation={
                    question.explanation ? (
                      <p className="rounded-lg bg-gray-50 p-3">
                        {question.explanation}
                      </p>
                    ) : null
                  }
                  tone={
                    question.is_correct === true
                      ? "correct"
                      : question.is_correct === false
                        ? "incorrect"
                        : "neutral"
                  }
                  actions={
                    data.status === "SUBMITTED" ? (
                      <GradeOverrideButtons
                        current={question.is_correct}
                        disabled={overrideMutation.isPending}
                        onSet={(correct) =>
                          overrideMutation.mutate({
                            questionId: question.id,
                            correct,
                          })
                        }
                      />
                    ) : null
                  }
                />
              ))}
            </QuestionReviewSection>

            <AttemptReportFooter
              links={
                <>
                  <Link
                    to={`/admin/students/${data.student_id}/report`}
                    className="btn-primary"
                  >
                    Reporte general
                  </Link>
                  <Link
                    to={
                      data.mode === "practice"
                        ? `/admin/students/${data.student_id}/practice/present-perfect`
                        : `/admin/students/${data.student_id}/exams/present-perfect`
                    }
                    className="inline-flex rounded-xl border px-4 py-2.5"
                  >
                    {data.mode === "practice"
                      ? "Reporte Practice"
                      : "Reporte Present Perfect Exam"}
                  </Link>
                  <Link
                    to={
                      data.mode === "practice"
                        ? "/admin/practice/present-perfect"
                        : "/admin/exams/present-perfect"
                    }
                    className="inline-flex rounded-xl border px-4 py-2.5"
                  >
                    Volver al módulo
                  </Link>
                </>
              }
            />
          </div>
        )}
      </QueryState>
    </AppShell>
  );
}
