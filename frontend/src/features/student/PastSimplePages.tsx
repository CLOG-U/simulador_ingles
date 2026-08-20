import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ApiError } from "../../lib/api";
import { pastSimpleApi } from "../../lib/endpoints";
import type {
  PastSimpleAttempt,
  PastSimpleQuestion,
  PastSimpleResult,
} from "../../lib/types";
import {
  ExamResultActions,
  ExamResultShell,
  ExamResultSummary,
  ExamReviewActions,
  ExamReviewCard,
  type ReviewStatus,
} from "./ExamResultShared";

const SAVE_DEBOUNCE_MS = 1000;

function RequestError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <AppShell title={title}>
      <section className="card space-y-4">
        <p className="text-danger">
          {error instanceof ApiError ? error.message : "The information could not be loaded."}
        </p>
        <div className="flex gap-3">
          <button type="button" className="btn-primary" onClick={onRetry}>
            Try Again
          </button>
          <Link to="/student/exams" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Exams
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export function PastSimpleInstructionsPage() {
  return (
    <AppShell title="Past Simple Exam">
      <section className="card max-w-2xl space-y-4">
        <h2 className="text-xl font-semibold">Past Simple Exam</h2>
        <p>
          Read each question carefully and select or write the correct answer. You will see your
          results after completing the exam.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>Total questions: 24</li>
          <li>Each question has the same value.</li>
          <li>Answers cannot be checked during the exam.</li>
          <li>Submit the exam when you finish.</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link to="/student/exams/past_simple_exam/start" className="btn-primary">
            Start Exam
          </Link>
          <Link to="/student/exams" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Exams
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export function PastSimpleStartRedirect() {
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const { mutate, isPending, error } = useMutation({
    mutationFn: pastSimpleApi.startAttempt,
    onSuccess: (attempt) => {
      navigate(`/student/exams/past_simple_exam/attempts/${attempt.id}`, {
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
    return (
      <AppShell title="Past Simple Exam">
        <section className="card space-y-4">
          <p className="text-danger">
            {error instanceof ApiError
              ? error.message
              : "The exam could not be started. Please try again later."}
          </p>
          <Link to="/student/exams" className="btn-primary">
            Back to Exams
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Past Simple Exam">
      <p>{isPending ? "Preparing your questions…" : "Redirecting…"}</p>
    </AppShell>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  onBlur,
}: {
  question: PastSimpleQuestion;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  if (question.question_type === "multiple_choice" && question.options) {
    return (
      <fieldset className="space-y-2">
        <legend className="sr-only">Choose one answer</legend>
        {question.options.map((option) => (
          <label
            key={option}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 ${
              value === option
                ? "border-brand-primary bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              onBlur={onBlur}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <div>
      {question.question_type === "order_words" && (
        <p className="mb-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          Write the words in the correct order.
        </p>
      )}
      <label htmlFor={`answer-${question.id}`} className="mb-1 block text-sm font-medium">
        Your answer
      </label>
      <input
        id={`answer-${question.id}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete="off"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky"
      />
    </div>
  );
}

export function PastSimpleExamPage() {
  const { attemptId = "" } = useParams();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const savedRef = useRef<Record<string, string>>({});
  const initializedAttemptRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const autoSubmittingRef = useRef(false);
  const saveQueuesRef = useRef<Record<string, Promise<void>>>({});
  const queryClient = useQueryClient();

  const {
    data: attempt,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["past-simple-attempt", attemptId],
    queryFn: () => pastSimpleApi.getAttempt(attemptId),
    enabled: Boolean(attemptId),
  });
  const questions = useMemo(
    () => attempt?.questions.slice().sort((a, b) => a.position - b.position) ?? [],
    [attempt],
  );
  const question = questions[index];

  useEffect(() => {
    if (!attempt || initializedAttemptRef.current === attempt.id) return;
    const initial = Object.fromEntries(
      attempt.questions.map((item) => [item.id, item.answer ?? ""]),
    );
    setAnswers(initial);
    answersRef.current = initial;
    savedRef.current = { ...initial };
    initializedAttemptRef.current = attempt.id;
  }, [attempt]);

  useEffect(() => {
    if (attempt?.status === "SUBMITTED") {
      navigate(`/student/exams/past_simple_exam/results/${attempt.id}/review`, {
        replace: true,
      });
    }
  }, [attempt?.id, attempt?.status, navigate]);

  useEffect(() => {
    if (!attempt?.expires_at || attempt.status !== "IN_PROGRESS") {
      setSecondsLeft(null);
      return;
    }
    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(attempt.expires_at!).getTime() - Date.now()) / 1000,
        ),
      );
      setSecondsLeft(remaining);
      if (remaining === 0 && !autoSubmittingRef.current) {
        autoSubmittingRef.current = true;
        void Promise.allSettled(Object.values(saveQueuesRef.current))
          .then(() => pastSimpleApi.submit(attempt.id))
          .finally(() => {
            window.location.href = `/student/exams/past_simple_exam/results/${attempt.id}/review`;
          });
      }
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [attempt?.expires_at, attempt?.id, attempt?.status]);

  const queueSave = useCallback(
    (questionId: string, answer: string) => {
      const previous = saveQueuesRef.current[questionId] ?? Promise.resolve();
      const operation = previous
        .catch(() => undefined)
        .then(async () => {
          await pastSimpleApi.saveAnswer(
            attemptId,
            questionId,
            answer || null,
          );
          savedRef.current[questionId] = answer;
          setSaveLabel("Saved");
          queryClient.setQueryData<PastSimpleAttempt>(
            ["past-simple-attempt", attemptId],
            (old) =>
              old
                ? {
                    ...old,
                    questions: old.questions.map((item) =>
                      item.id === questionId
                        ? { ...item, answer: answer || null }
                        : item,
                    ),
                  }
                : old,
          );
        })
        .catch((saveError) => {
          setSaveLabel("Not saved");
          throw saveError;
        });
      saveQueuesRef.current[questionId] = operation;
      const cleanup = () => {
        if (saveQueuesRef.current[questionId] === operation) {
          delete saveQueuesRef.current[questionId];
        }
      };
      void operation.then(cleanup, cleanup);
      return operation;
    },
    [attemptId, queryClient],
  );

  const flushSave = useCallback(
    async (questionId: string) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const answer = answersRef.current[questionId] ?? "";
      if (savedRef.current[questionId] === answer) return;
      setSaveLabel("Saving…");
      await queueSave(questionId, answer);
    },
    [queueSave],
  );

  const updateAnswer = (questionId: string, value: string) => {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    setAnswers(next);
    setSaveLabel("");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flushSave(questionId).catch(() => undefined);
    }, SAVE_DEBOUNCE_MS);
  };

  const goTo = async (nextIndex: number) => {
    if (!question || nextIndex < 0 || nextIndex >= questions.length) return;
    try {
      await flushSave(question.id);
    } catch {
      return;
    }
    setIndex(nextIndex);
    setSaveLabel("");
  };

  const unanswered = questions.filter(
    (item) => !(answers[item.id] ?? item.answer ?? "").trim(),
  ).length;
  const answered = questions.length - unanswered;

  if (isError) {
    return (
      <AppShell title="Past Simple Exam">
        <section className="card space-y-4">
          <p className="text-danger">
            {error instanceof ApiError
              ? error.message
              : "The exam could not be loaded."}
          </p>
          <div className="flex gap-3">
            <button type="button" className="btn-primary" onClick={() => void refetch()}>
              Try Again
            </button>
            <Link to="/student/exams" className="inline-flex rounded-xl border px-4 py-2.5">
              Back to Exams
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  if (isLoading || !attempt || !question) {
    return (
      <AppShell title="Past Simple Exam">
        <p>Loading questions…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Past Simple Exam">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
        <span>
          Question {question.position} of {questions.length}
        </span>
        <span>
          Answered: {answered} · Pending: {unanswered}
          {secondsLeft != null
            ? ` · Time: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            : ""}
          {saveLabel ? ` · ${saveLabel}` : ""}
        </span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-brand-primary"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          aria-label={`${Math.round(((index + 1) / questions.length) * 100)}% complete`}
        />
      </div>

      <section className="card space-y-5">
        <p className="text-sm font-medium text-brand-purple">{question.instruction}</p>
        <h2 className="text-xl font-semibold">{question.question}</h2>
        <QuestionInput
          question={question}
          value={answers[question.id] ?? ""}
          onChange={(value) => updateAnswer(question.id, value)}
          onBlur={() => void flushSave(question.id).catch(() => undefined)}
        />
      </section>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Question navigation">
        {questions.map((item, itemIndex) => {
          const hasAnswer = (answers[item.id] ?? "").trim().length > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void goTo(itemIndex)}
              className={`min-h-11 min-w-11 rounded-lg border px-3 ${
                itemIndex === index
                  ? "border-brand-primary bg-brand-primary text-white"
                  : hasAnswer
                    ? "border-green-300 bg-green-50"
                    : "bg-white"
              }`}
            >
              {item.position}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4"
          disabled={index === 0}
          onClick={() => void goTo(index - 1)}
        >
          Previous
        </button>
        {index < questions.length - 1 ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => void goTo(index + 1)}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              try {
                await flushSave(question.id);
                setShowSubmit(true);
              } catch {
                // Keep the student on the exam until the answer is saved.
              }
            }}
          >
            Submit Exam
          </button>
        )}
      </div>

      {showSubmit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") setShowSubmit(false);
          }}
        >
          <section
            className="card max-w-md space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="past-simple-submit-title"
          >
            <h3 id="past-simple-submit-title" className="text-lg font-semibold">
              Submit Past Simple Exam?
            </h3>
            <p>
              You have {unanswered} unanswered question{unanswered === 1 ? "" : "s"}. After
              submitting, answers cannot be changed.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="min-h-11 rounded-xl border px-4"
                onClick={() => setShowSubmit(false)}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  try {
                    for (const item of questions) await flushSave(item.id);
                    await Promise.all(Object.values(saveQueuesRef.current));
                    await pastSimpleApi.submit(attemptId);
                    window.location.href = `/student/exams/past_simple_exam/results/${attemptId}/review`;
                  } catch {
                    setShowSubmit(false);
                    setSaveLabel("Not saved");
                  }
                }}
              >
                Confirm Submit
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function ResultSummary({ result }: { result: PastSimpleResult }) {
  return (
    <ExamResultSummary
      studentName={result.student_name}
      examName={result.exam_name}
      attemptNumber={result.attempt_number}
      submittedAt={result.submitted_at}
      passed={result.passed}
      percentage={result.percentage}
      scoreOutOfTen={result.score_out_of_ten}
      correct={result.correct_answers}
      incorrect={result.incorrect_answers}
      unanswered={result.unanswered_answers}
    />
  );
}

export function PastSimpleResultPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["past-simple-result", attemptId],
    queryFn: () => pastSimpleApi.result(attemptId),
    enabled: Boolean(attemptId),
  });

  if (isError) {
    return (
      <RequestError
        title="Past Simple Exam Result"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <ExamResultShell title="Past Simple Exam Result">
        <p>Loading result…</p>
      </ExamResultShell>
    );
  }

  return (
    <ExamResultShell title="Past Simple Exam Result">
      <ResultSummary result={data} />
      <ExamResultActions
        showReview={(data.questions?.length ?? 0) > 0}
        reviewPath={`/student/exams/past_simple_exam/results/${attemptId}/review`}
      />
    </ExamResultShell>
  );
}

export function PastSimpleReviewPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["past-simple-result", attemptId],
    queryFn: () => pastSimpleApi.result(attemptId),
    enabled: Boolean(attemptId),
  });

  if (isError) {
    return (
      <RequestError
        title="Review Answers"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <ExamResultShell title="Review Answers">
        <p>Loading review…</p>
      </ExamResultShell>
    );
  }

  return (
    <ExamResultShell title="Review Answers">
      {data.questions.length === 0 && (
        <section className="card">
          <p>The answer review is not available for this exam.</p>
        </section>
      )}
      {data.questions.map((question) => (
        <ExamReviewCard
          key={question.id}
          position={question.position}
          title={question.question}
          status={(question.status as ReviewStatus) ?? "unanswered"}
          meta={`Topic: ${question.topic}`}
          studentAnswer={question.answer || "Unanswered"}
          correctAnswer={question.correct_answer}
          explanation={question.explanation}
        />
      ))}
      <ExamReviewActions
        resultPath={`/student/exams/past_simple_exam/results/${attemptId}`}
      />
    </ExamResultShell>
  );
}
