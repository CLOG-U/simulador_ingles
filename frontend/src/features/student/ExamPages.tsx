import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ApiError } from "../../lib/api";
import { examApi } from "../../lib/endpoints";
import type { Attempt, ExamQuestion } from "../../lib/types";

type AnswerSet = { base: string; past: string; spanish: string };

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "offline";

const SAVE_DEBOUNCE_MS = 1500;

function fieldKey(field: string): "base" | "past" | "spanish" {
  if (field === "BASE") return "base";
  if (field === "PAST") return "past";
  return "spanish";
}

function emptyAnswers(): AnswerSet {
  return { base: "", past: "", spanish: "" };
}

function serializeAnswers(answers: AnswerSet) {
  return JSON.stringify(answers);
}

function answersFromQuestion(question: ExamQuestion): AnswerSet {
  return {
    base: question.answers.base ?? "",
    past: question.answers.past ?? "",
    spanish: question.answers.spanish ?? "",
  };
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
  const [localAnswers, setLocalAnswers] = useState<Record<string, AnswerSet>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showSubmit, setShowSubmit] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const lastSavedRef = useRef<Record<string, string>>({});
  const localAnswersRef = useRef<Record<string, AnswerSet>>({});
  const savingRef = useRef<Promise<void> | null>(null);
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
      payload: AnswerSet;
    }) => examApi.saveAnswer(attemptId, questionId, payload),
    onSuccess: (_data, { questionId, payload }) => {
      queryClient.setQueryData<Attempt>(["attempt", attemptId], (old) => {
        if (!old) return old;
        return {
          ...old,
          questions: old.questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  answers: {
                    base: payload.base || null,
                    past: payload.past || null,
                    spanish: payload.spanish || null,
                  },
                }
              : q,
          ),
        };
      });
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
  const answers = question ? (localAnswers[question.id] ?? emptyAnswers()) : emptyAnswers();

  useEffect(() => {
    localAnswersRef.current = localAnswers;
  }, [localAnswers]);

  useEffect(() => {
    if (!attempt) return;
    const initial: Record<string, AnswerSet> = {};
    const saved: Record<string, string> = {};
    for (const q of attempt.questions) {
      const next = answersFromQuestion(q);
      initial[q.id] = next;
      saved[q.id] = serializeAnswers(next);
    }
    setLocalAnswers(initial);
    localAnswersRef.current = initial;
    lastSavedRef.current = saved;
  }, [attempt?.id]);

  const persistAnswers = useCallback(
    async (questionId: string, payload: AnswerSet) => {
      const serialized = serializeAnswers(payload);
      if (serialized === lastSavedRef.current[questionId]) {
        setSaveStatus("idle");
        return;
      }

      setSaveStatus("saving");
      try {
        await saveMutation.mutateAsync({ questionId, payload });
        lastSavedRef.current[questionId] = serialized;
      } catch {
        setSaveStatus("offline");
        throw new Error("save failed");
      }
    },
    [saveMutation],
  );

  const flushSave = useCallback(
    async (questionId: string) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      const payload = localAnswersRef.current[questionId];
      if (!payload) return;

      if (savingRef.current) {
        try {
          await savingRef.current;
        } catch {
          /* prior save failed */
        }
      }

      const serialized = serializeAnswers(payload);
      if (serialized === lastSavedRef.current[questionId]) return;

      const savePromise = persistAnswers(questionId, payload);
      savingRef.current = savePromise;
      try {
        await savePromise;
      } finally {
        if (savingRef.current === savePromise) {
          savingRef.current = null;
        }
      }
    },
    [persistAnswers],
  );

  const scheduleSave = useCallback(
    (questionId: string) => {
      setSaveStatus("pending");
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void flushSave(questionId);
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );

  const flushAllSaves = useCallback(async () => {
    if (!questions.length) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    for (const q of questions) {
      await flushSave(q.id);
    }
  }, [flushSave, questions]);

  const goToIndex = async (nextIndex: number) => {
    if (!question || nextIndex === index || isNavigating) return;
    setIsNavigating(true);
    try {
      await flushSave(question.id);
      setIndex(nextIndex);
      setSaveStatus("idle");
    } finally {
      setIsNavigating(false);
    }
  };

  const emptyCount = questions.reduce((acc, q) => {
    const source = localAnswers[q.id] ?? answersFromQuestion(q);
    const req = q.required_fields.map((f) => fieldKey(f.field));
    const empty = req.filter((k) => !source[k].trim()).length;
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
      : saveStatus === "saving" || isNavigating
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
                  setLocalAnswers((prev) => ({ ...prev, [question.id]: next }));
                  localAnswersRef.current = { ...localAnswersRef.current, [question.id]: next };
                  scheduleSave(question.id);
                }}
                onBlur={() => void flushSave(question.id)}
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
            disabled={isNavigating}
            onClick={() => void goToIndex(i)}
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
          disabled={index === 0 || isNavigating}
          onClick={() => void goToIndex(index - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4"
          disabled={index >= questions.length - 1 || isNavigating}
          onClick={() => void goToIndex(index + 1)}
        >
          Siguiente
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={isNavigating}
          onClick={async () => {
            await flushSave(question.id);
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
                  await flushAllSaves();
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
