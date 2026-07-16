import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ApiError } from "../../lib/api";
import { examApi } from "../../lib/endpoints";
import type { ExamQuestion } from "../../lib/types";

type SaveStatus = "idle" | "saving" | "saved" | "offline";

function fieldKey(field: string): "base" | "past" | "spanish" {
  if (field === "BASE") return "base";
  if (field === "PAST") return "past";
  return "spanish";
}

export function ExamStartRedirect() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["attempt-start"],
    queryFn: examApi.startAttempt,
  });

  useEffect(() => {
    if (data?.id) navigate(`/student/exam/${data.id}`, { replace: true });
  }, [data, navigate]);

  if (error) {
    const apiError = error instanceof ApiError ? error : null;
    const message =
      apiError?.message ?? "No se pudo iniciar la evaluación. Intenta de nuevo más tarde.";
    const isMaxAttempts = apiError?.code === "MAX_ATTEMPTS_REACHED";

    return (
      <AppShell title="Evaluación">
        <div className="card space-y-4">
          <p className={isMaxAttempts ? "text-amber-800" : "text-danger"}>{message}</p>
          {isMaxAttempts && (
            <Link to="/student" className="btn-primary inline-flex">
              Volver al panel
            </Link>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Evaluación">
      <p>{isLoading ? "Preparando preguntas…" : "Redirigiendo…"}</p>
    </AppShell>
  );
}

export function ExamPage() {
  const { attemptId = "" } = useParams();
  const [index, setIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showSubmit, setShowSubmit] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => examApi.getAttempt(attemptId),
    enabled: Boolean(attemptId),
  });

  const saveMutation = useMutation({
    mutationFn: ({
      questionId,
      answers,
    }: {
      questionId: string;
      answers: Record<string, string | null>;
    }) => examApi.saveAnswer(attemptId, questionId, answers),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => setSaveStatus("saved"),
    onError: () => setSaveStatus("offline"),
  });

  const submitMutation = useMutation({
    mutationFn: () => examApi.submit(attemptId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attempt-current"] });
    },
  });

  const questions = useMemo(
    () => attempt?.questions.slice().sort((a, b) => a.position - b.position) ?? [],
    [attempt],
  );
  const question: ExamQuestion | undefined = questions[index];

  const localAnswers = useRef<Record<string, { base: string; past: string; spanish: string }>>({});

  useEffect(() => {
    if (!question) return;
    if (!localAnswers.current[question.id]) {
      localAnswers.current[question.id] = {
        base: question.answers.base ?? "",
        past: question.answers.past ?? "",
        spanish: question.answers.spanish ?? "",
      };
    }
  }, [question]);

  const scheduleSave = (questionId: string, answers: Record<string, string>) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void saveMutation.mutateAsync({ questionId, answers });
    }, 400);
  };

  const emptyCount = questions.reduce((acc, q) => {
    const a = localAnswers.current[q.id] ?? q.answers;
    const req = q.required_fields.map((f) => fieldKey(f.field));
    const empty = req.filter((k) => !(a[k as keyof typeof a] ?? "").trim()).length;
    return acc + empty;
  }, 0);

  if (isLoading || !attempt || !question) {
    return (
      <AppShell title="Evaluación">
        <p>Cargando preguntas…</p>
      </AppShell>
    );
  }

  const current = localAnswers.current[question.id] ?? {
    base: question.answers.base ?? "",
    past: question.answers.past ?? "",
    spanish: question.answers.spanish ?? "",
  };

  return (
    <AppShell title="Evaluación">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Pregunta {question.position} de {questions.length}
        </span>
        <span aria-live="polite">
          {saveStatus === "saving" && "Guardando…"}
          {saveStatus === "saved" && "Guardado"}
          {saveStatus === "offline" && "Sin conexión"}
        </span>
      </div>

      <section className="card space-y-4">
        <p className="text-sm font-medium text-brand-purple">{question.prompt_label}</p>
        <p className="text-2xl font-bold text-brand-primary">{question.shown_value}</p>

        {question.required_fields.map((field) => {
          const key = fieldKey(field.field);
          return (
            <div key={field.field}>
              <label htmlFor={key} className="mb-1 block text-sm font-medium">
                {field.label}
              </label>
              <input
                id={key}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky"
                value={current[key]}
                onChange={(e) => {
                  current[key] = e.target.value;
                  scheduleSave(question.id, { ...current });
                }}
                onBlur={() => void saveMutation.mutateAsync({ questionId: question.id, answers: current })}
              />
            </div>
          );
        })}
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setIndex(i)}
            className={`min-h-11 min-w-11 rounded-lg border px-3 ${
              i === index ? "border-brand-primary bg-brand-primary text-white" : "bg-white"
            }`}
            aria-label={`Ir a pregunta ${q.position}`}
          >
            {q.position}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4"
          disabled={index >= questions.length - 1}
          onClick={() => setIndex((i) => i + 1)}
        >
          Siguiente
        </button>
        <button type="button" className="btn-primary" onClick={() => setShowSubmit(true)}>
          Entregar
        </button>
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Confirmar entrega</h3>
            <p>
              Tienes {emptyCount} campo(s) vacío(s). ¿Deseas entregar la evaluación?
            </p>
            <div className="flex gap-3">
              <button type="button" className="min-h-11 rounded-xl border px-4" onClick={() => setShowSubmit(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  await submitMutation.mutateAsync();
                  window.location.href = `/student/result/${attemptId}`;
                }}
              >
                Entregar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export function ExamResultPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["result", attemptId],
    queryFn: () => examApi.result(attemptId),
    enabled: Boolean(attemptId),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Resultado">
        <p>Cargando resultado…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Resultado">
      <section className="card space-y-3">
        <h2 className="text-xl font-bold">
          {data.passed ? "¡Aprobado!" : "No aprobado"}
        </h2>
        <p className="text-3xl font-bold text-brand-primary">{data.percentage?.toFixed(1)}%</p>
        <p>
          Campos correctos: {data.correct_fields} de {data.total_fields}
        </p>
        <p>
          Verbos completamente correctos: {data.fully_correct_questions} de{" "}
          {(data.total_fields ?? 40) / 2}
        </p>
        {data.questions && data.questions.length > 0 && (
          <div className="space-y-3 pt-4">
            <h3 className="font-semibold">Revisión</h3>
            {data.questions.map((q) => (
              <article key={q.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{q.prompt_label}: {q.shown_value}</p>
                {q.grades && q.expected && (
                  <ul className="mt-2 space-y-1">
                    {(["base", "past", "spanish"] as const).map((k) =>
                      q.grades?.[k] != null ? (
                        <li key={k} className={q.grades[k] ? "text-success" : "text-danger"}>
                          {k}: tu respuesta «{q.answers[k] ?? "—"}» — esperado «
                          {q.expected?.[k]}» {q.grades[k] ? "✓" : "✗"}
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
        <Link to="/student" className="btn-primary mt-4 inline-flex">
          Volver al panel
        </Link>
      </section>
    </AppShell>
  );
}
