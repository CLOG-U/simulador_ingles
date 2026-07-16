import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ApiError } from "../../lib/api";
import { examApi } from "../../lib/endpoints";
import type { ExamQuestion } from "../../lib/types";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "offline";

const SAVE_DEBOUNCE_MS = 1500;

function fieldKey(field: string): "base" | "past" | "spanish" {
  if (field === "BASE") return "base";
  if (field === "PAST") return "past";
  return "spanish";
}

function emptyAnswers() {
  return { base: "", past: "", spanish: "" };
}

function serializeAnswers(answers: { base: string; past: string; spanish: string }) {
  return JSON.stringify(answers);
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
  const [answers, setAnswers] = useState(emptyAnswers);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showSubmit, setShowSubmit] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const lastSavedRef = useRef("");
  const dirtyRef = useRef(false);
  const savedTimeoutRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => examApi.getAttempt(attemptId),
    enabled: Boolean(attemptId),
  });

  const saveMutation = useMutation({
    mutationFn: ({
      questionId,
      payload,
    }: {
      questionId: string;
      payload: { base: string; past: string; spanish: string };
    }) => examApi.saveAnswer(attemptId, questionId, payload),
    onSuccess: () => {
      setSaveStatus("saved");
      if (savedTimeoutRef.current) window.clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = window.setTimeout(() => setSaveStatus("idle"), 2000);
    },
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

  useEffect(() => {
    if (!question) return;
    const next = {
      base: question.answers.base ?? "",
      past: question.answers.past ?? "",
      spanish: question.answers.spanish ?? "",
    };
    setAnswers(next);
    lastSavedRef.current = serializeAnswers(next);
    dirtyRef.current = false;
    setSaveStatus("idle");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  }, [question?.id]);

  const persistAnswers = useCallback(
    async (questionId: string, payload: { base: string; past: string; spanish: string }) => {
      const serialized = serializeAnswers(payload);
      if (serialized === lastSavedRef.current) {
        dirtyRef.current = false;
        setSaveStatus("idle");
        return;
      }
      setSaveStatus("saving");
      try {
        await saveMutation.mutateAsync({ questionId, payload });
        lastSavedRef.current = serialized;
        dirtyRef.current = false;
      } catch {
        setSaveStatus("offline");
      }
    },
    [saveMutation],
  );

  const scheduleSave = useCallback(
    (questionId: string, payload: { base: string; past: string; spanish: string }) => {
      dirtyRef.current = true;
      setSaveStatus("pending");
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void persistAnswers(questionId, payload);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistAnswers],
  );

  const flushSave = useCallback(
    (questionId: string, payload: { base: string; past: string; spanish: string }) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (!dirtyRef.current) return;
      void persistAnswers(questionId, payload);
    },
    [persistAnswers],
  );

  const emptyCount = questions.reduce((acc, q) => {
    const req = q.required_fields.map((f) => fieldKey(f.field));
    const source = q.id === question?.id ? answers : q.answers;
    const empty = req.filter((k) => !(source[k as keyof typeof source] ?? "").trim()).length;
    return acc + empty;
  }, 0);

  if (isLoading || !attempt || !question) {
    return (
      <AppShell title="Evaluación">
        <p>Cargando preguntas…</p>
      </AppShell>
    );
  }

  const statusLabel =
    saveStatus === "pending"
      ? ""
      : saveStatus === "saving"
        ? "Guardando…"
        : saveStatus === "saved"
          ? "Guardado"
          : saveStatus === "offline"
            ? "Sin conexión"
            : "";

  return (
    <AppShell title="Evaluación">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Pregunta {question.position} de {questions.length}
        </span>
        <span aria-live="polite">{statusLabel}</span>
      </div>

      <section className="card space-y-4">
        <p className="text-sm font-medium text-brand-purple">{question.prompt_label}</p>
        <p className="text-2xl font-bold text-brand-primary">{question.shown_value}</p>

        {question.required_fields.map((field) => {
          const key = fieldKey(field.field);
          return (
            <div key={field.field}>
              <label htmlFor={`${question.id}-${key}`} className="mb-1 block text-sm font-medium">
                {field.label}
              </label>
              <input
                id={`${question.id}-${key}`}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky"
                value={answers[key]}
                onChange={(e) => {
                  const next = { ...answers, [key]: e.target.value };
                  setAnswers(next);
                  scheduleSave(question.id, next);
                }}
                onBlur={() => flushSave(question.id, answers)}
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
            onClick={() => {
              flushSave(question.id, answers);
              setIndex(i);
            }}
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
          onClick={() => {
            flushSave(question.id, answers);
            setIndex((i) => i - 1);
          }}
        >
          Anterior
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4"
          disabled={index >= questions.length - 1}
          onClick={() => {
            flushSave(question.id, answers);
            setIndex((i) => i + 1);
          }}
        >
          Siguiente
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            flushSave(question.id, answers);
            setShowSubmit(true);
          }}
        >
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
              <button
                type="button"
                className="min-h-11 rounded-xl border px-4"
                onClick={() => setShowSubmit(false)}
              >
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
                <p className="font-medium">
                  {q.prompt_label}: {q.shown_value}
                </p>
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
