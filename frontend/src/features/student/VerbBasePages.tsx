import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ApiError } from "../../lib/api";
import { verbBaseApi } from "../../lib/endpoints";
import type { Attempt, ExamQuestion } from "../../lib/types";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "offline";

const SAVE_DEBOUNCE_MS = 1500;

function answerFromQuestion(question: ExamQuestion): string {
  return question.answers.base ?? "";
}

export function VerbBaseInstructionsPage() {
  return (
    <AppShell title="Instructions">
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Verb Base Form</h2>
        <p>
          You will see the Spanish meaning or the past form, and you will write
          only the base form of the verb in English.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            <strong>From Spanish:</strong> we give you the meaning → write the
            base form.
          </li>
          <li>
            <strong>From past:</strong> we give you the past form → write the
            base form.
          </li>
        </ul>
        <p className="text-sm text-gray-600">
          Example: <em>went</em> → <em>go</em>
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/student/exams/verb_base_exam/start"
            className="btn-primary inline-flex"
          >
            Start Exam
          </Link>
          <Link
            to="/student/exams"
            className="inline-flex rounded-xl border px-4 py-2.5"
          >
            Back to Exams
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export function VerbBaseStartRedirect() {
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const { mutate, isPending, error } = useMutation({
    mutationFn: verbBaseApi.startAttempt,
    onSuccess: (attempt) => {
      navigate(`/student/exams/verb_base_exam/attempts/${attempt.id}`, {
        replace: true,
      });
    },
  });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    mutate();
  }, [mutate]);

  if (error) {
    const apiError = error instanceof ApiError ? error : null;
    const message =
      apiError?.message ??
      "The exam could not be started. Please try again later.";
    const isMaxAttempts = apiError?.code === "MAX_ATTEMPTS_REACHED";

    return (
      <AppShell title="Verb Base Form">
        <div className="card space-y-4">
          <p className={isMaxAttempts ? "text-amber-800" : "text-danger"}>
            {message}
          </p>
          {isMaxAttempts && (
            <Link to="/student/exams" className="btn-primary inline-flex">
              Back to Exams
            </Link>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Verb Base Form">
      <p>{isPending ? "Preparing questions…" : "Redirecting…"}</p>
    </AppShell>
  );
}

export function VerbBaseExamPage() {
  const { attemptId = "" } = useParams();
  const [index, setIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showSubmit, setShowSubmit] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const lastSavedRef = useRef<Record<string, string>>({});
  const localAnswersRef = useRef<Record<string, string>>({});
  const initializedAttemptRef = useRef<string | null>(null);
  const savingRef = useRef<Promise<void> | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["verb-base-attempt", attemptId],
    queryFn: () => verbBaseApi.getAttempt(attemptId),
    enabled: Boolean(attemptId),
  });

  const saveMutation = useMutation({
    mutationFn: ({
      questionId,
      answer,
    }: {
      questionId: string;
      answer: string;
    }) => verbBaseApi.saveAnswer(attemptId, questionId, answer || null),
    onSuccess: (_data, { questionId, answer }) => {
      queryClient.setQueryData<Attempt>(["verb-base-attempt", attemptId], (old) => {
        if (!old) return old;
        return {
          ...old,
          questions: old.questions.map((q) =>
            q.id === questionId
              ? { ...q, answers: { ...q.answers, base: answer || null } }
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
    mutationFn: () => verbBaseApi.submit(attemptId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attempt-status", "verb_base_exam"] });
    },
  });

  const questions = useMemo(
    () => attempt?.questions.slice().sort((a, b) => a.position - b.position) ?? [],
    [attempt],
  );
  const question: ExamQuestion | undefined = questions[index];
  const answer = question ? (localAnswers[question.id] ?? "") : "";

  useEffect(() => {
    localAnswersRef.current = localAnswers;
  }, [localAnswers]);

  useEffect(() => {
    if (!attempt || initializedAttemptRef.current === attempt.id) return;
    const initial: Record<string, string> = {};
    const saved: Record<string, string> = {};
    for (const q of attempt.questions) {
      const next = answerFromQuestion(q);
      initial[q.id] = next;
      saved[q.id] = next;
    }
    setLocalAnswers(initial);
    localAnswersRef.current = initial;
    lastSavedRef.current = saved;
    initializedAttemptRef.current = attempt.id;
  }, [attempt]);

  const persistAnswer = useCallback(
    async (questionId: string, value: string) => {
      if (value === lastSavedRef.current[questionId]) {
        setSaveStatus("idle");
        return;
      }
      setSaveStatus("saving");
      try {
        await saveMutation.mutateAsync({ questionId, answer: value });
        lastSavedRef.current[questionId] = value;
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
      if (payload === undefined) return;

      if (savingRef.current) {
        try {
          await savingRef.current;
        } catch {
          /* prior save failed */
        }
      }

      if (payload === lastSavedRef.current[questionId]) return;

      const savePromise = persistAnswer(questionId, payload);
      savingRef.current = savePromise;
      try {
        await savePromise;
      } finally {
        if (savingRef.current === savePromise) {
          savingRef.current = null;
        }
      }
    },
    [persistAnswer],
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
    const source = localAnswers[q.id] ?? answerFromQuestion(q);
    return acc + (source.trim() ? 0 : 1);
  }, 0);

  if (isLoading || !attempt || !question) {
    return (
      <AppShell title="Verb Base Form">
        <p>Loading questions…</p>
      </AppShell>
    );
  }

  const statusLabel =
    saveStatus === "pending"
      ? ""
      : saveStatus === "saving" || isNavigating
        ? "Saving…"
        : saveStatus === "saved"
          ? "Saved"
          : saveStatus === "offline"
            ? "Offline"
            : "";

  const baseField =
    question.required_fields.find((f) => f.field === "BASE") ?? {
      field: "BASE",
      label: "base form in English",
    };

  return (
    <AppShell title="Verb Base Form">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Question {question.position} of {questions.length}
        </span>
        <span aria-live="polite">{statusLabel}</span>
      </div>

      <section className="card space-y-4">
        <p className="text-sm font-medium text-brand-purple">{question.prompt_label}</p>
        <p className="text-2xl font-bold text-brand-primary">{question.shown_value}</p>

        <div>
          <label htmlFor={`${question.id}-base`} className="mb-1 block text-sm font-medium">
            {baseField.label}
          </label>
          <input
            id={`${question.id}-base`}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky"
            value={answer}
            autoComplete="off"
            onChange={(e) => {
              const next = e.target.value;
              setLocalAnswers((prev) => ({ ...prev, [question.id]: next }));
              localAnswersRef.current = {
                ...localAnswersRef.current,
                [question.id]: next,
              };
              scheduleSave(question.id);
            }}
            onBlur={() => void flushSave(question.id)}
          />
        </div>
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
            aria-label={`Go to question ${q.position}`}
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
          Previous
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4"
          disabled={index >= questions.length - 1 || isNavigating}
          onClick={() => void goToIndex(index + 1)}
        >
          Next
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
          Submit
        </button>
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Confirm submit</h3>
            <p>
              You have {emptyCount} empty field(s). Do you want to submit the exam?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="min-h-11 rounded-xl border px-4"
                onClick={() => setShowSubmit(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  await flushAllSaves();
                  await submitMutation.mutateAsync();
                  window.location.href = `/student/exams/verb_base_exam/results/${attemptId}`;
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export function VerbBaseResultPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["verb-base-result", attemptId],
    queryFn: () => verbBaseApi.result(attemptId),
    enabled: Boolean(attemptId),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Result">
        <p>Loading result…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Result">
      <section className="card space-y-3">
        <h2 className="text-xl font-bold">
          {data.passed ? "Passed!" : "Not passed"}
        </h2>
        <p className="text-3xl font-bold text-brand-primary">
          {data.percentage?.toFixed(1)}%
        </p>
        <p>
          Correct answers: {data.correct_answers ?? 0} of{" "}
          {data.total_questions}
        </p>
        <p>
          Incorrect: {data.incorrect_answers ?? 0} · Unanswered:{" "}
          {data.unanswered_answers ?? 0}
        </p>
        {data.questions && data.questions.length > 0 && (
          <div className="space-y-3 pt-4">
            <h3 className="font-semibold">Review</h3>
            {data.questions.map((q) => (
              <article key={q.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {q.prompt_label}: {q.shown_value}
                </p>
                {q.grades && q.expected && (
                  <p
                    className={
                      q.grades.base ? "mt-2 text-success" : "mt-2 text-danger"
                    }
                  >
                    base form: your answer «{q.answers.base ?? "—"}» — expected
                    «{q.expected.base}» {q.grades.base ? "✓" : "✗"}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
        <Link to="/student/exams" className="btn-primary mt-4 inline-flex">
          Back to Exams
        </Link>
      </section>
    </AppShell>
  );
}
