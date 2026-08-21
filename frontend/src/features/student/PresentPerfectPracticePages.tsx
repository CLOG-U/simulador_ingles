import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ApiError } from "../../lib/api";
import { presentPerfectApi } from "../../lib/endpoints";
import type { PresentPerfectQuestion, PresentPerfectResult } from "../../lib/types";

function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: PresentPerfectQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  if (
    (question.question_type === "multiple_choice" ||
      question.question_type === "identify" ||
      question.question_type === "short_answer") &&
    question.options
  ) {
    return (
      <fieldset className="space-y-2" disabled={disabled}>
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
              name={`practice-${question.id}`}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              disabled={disabled}
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
          {question.instruction || "Put the words in the correct order."}
        </p>
      )}
      <label htmlFor={`practice-answer-${question.id}`} className="mb-1 block text-sm font-medium">
        Your answer
      </label>
      <input
        id={`practice-answer-${question.id}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky disabled:bg-gray-50"
      />
    </div>
  );
}

export function PresentPerfectPracticeInstructionsPage() {
  const { data: status } = useQuery({
    queryKey: ["present-perfect-practice-status"],
    queryFn: presentPerfectApi.practiceStatus,
  });

  return (
    <AppShell title="Present Perfect Practice">
      <section className="card max-w-2xl space-y-4">
        <h2 className="text-xl font-semibold">Present Perfect Practice</h2>
        <p>
          Practice with the same question types used in the exam. You will get
          immediate feedback after each answer. Practice sessions do not count
          as exam attempts.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            Question bank: {status?.question_bank_size ?? "—"} active questions
          </li>
          <li>Each practice session: 24 questions (2 per topic)</li>
          <li>Check answers as you go</li>
          <li>Unlimited practice sessions</li>
          <li>Sessions completed: {status?.submitted_count ?? 0}</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          {status?.has_open_attempt && status.open_attempt_id ? (
            <Link
              to={`/student/practice/present_perfect/sessions/${status.open_attempt_id}`}
              className="btn-primary"
            >
              Resume Practice
            </Link>
          ) : status?.can_start_new ? (
            <Link to="/student/practice/present_perfect/start" className="btn-primary">
              Start Practice
            </Link>
          ) : (
            <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
              Practice is not enabled for your account.
            </p>
          )}
          <Link to="/student/practice" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Practice
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export function PresentPerfectPracticeStartRedirect() {
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const { mutate, isPending, error } = useMutation({
    mutationFn: presentPerfectApi.startPractice,
    onSuccess: (session) => {
      navigate(`/student/practice/present_perfect/sessions/${session.id}`, {
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
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Practice could not be started.";
    return (
      <AppShell title="Present Perfect Practice">
        <section className="card space-y-4">
          <p className="text-danger">{message}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                startedRef.current = false;
                mutate();
              }}
            >
              Try Again
            </button>
            <Link to="/student/practice" className="inline-flex rounded-xl border px-4 py-2.5">
              Back to Practice
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Present Perfect Practice">
      <p>{isPending ? "Preparing practice questions…" : "Redirecting…"}</p>
    </AppShell>
  );
}

export function PresentPerfectPracticeSessionPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, PresentPerfectQuestion>>({});
  const [submitting, setSubmitting] = useState(false);
  const initializedRef = useRef<string | null>(null);

  const { data: session, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["present-perfect-practice", sessionId],
    queryFn: () => presentPerfectApi.getPractice(sessionId),
    enabled: Boolean(sessionId),
  });

  const questions = useMemo(
    () => session?.questions.slice().sort((a, b) => a.position - b.position) ?? [],
    [session],
  );
  const question = questions[index];

  useEffect(() => {
    if (!session || initializedRef.current === session.id) return;
    const initial = Object.fromEntries(
      session.questions.map((item) => [item.id, item.answer ?? ""]),
    );
    setAnswers(initial);
    const initialFeedback = Object.fromEntries(
      session.questions
        .filter((item) => item.correct_answer != null)
        .map((item) => [item.id, item]),
    );
    setFeedback(initialFeedback);
    initializedRef.current = session.id;
  }, [session]);

  useEffect(() => {
    if (session?.status === "SUBMITTED") {
      navigate(`/student/practice/present_perfect/results/${session.id}/review`, {
        replace: true,
      });
    }
  }, [navigate, session?.id, session?.status]);

  const checkMutation = useMutation({
    mutationFn: () =>
      presentPerfectApi.checkPracticeAnswer(
        sessionId,
        question.id,
        answers[question.id] || null,
      ),
    onSuccess: (data) => {
      setFeedback((prev) => ({ ...prev, [data.id]: data }));
    },
  });

  if (isError) {
    return (
      <AppShell title="Present Perfect Practice">
        <section className="card space-y-4">
          <p className="text-danger">
            {error instanceof ApiError
              ? error.message
              : "Practice session could not be loaded."}
          </p>
          <button type="button" className="btn-primary" onClick={() => void refetch()}>
            Try Again
          </button>
        </section>
      </AppShell>
    );
  }

  if (isLoading || !session || !question) {
    return (
      <AppShell title="Present Perfect Practice">
        <p>Loading practice…</p>
      </AppShell>
    );
  }

  const currentFeedback = feedback[question.id];
  const checkedCount = Object.keys(feedback).length;

  return (
    <AppShell title="Present Perfect Practice">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
        <span>
          Question {question.position} of {questions.length}
        </span>
        <span>
          Checked: {checkedCount} · Practice mode (immediate feedback)
        </span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-brand-primary"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <section className="card space-y-5">
        <p className="text-sm font-medium text-brand-purple">{question.instruction}</p>
        <h2 className="text-xl font-semibold">{question.question}</h2>
        <QuestionInput
          question={question}
          value={answers[question.id] ?? ""}
          onChange={(value) =>
            setAnswers((prev) => ({ ...prev, [question.id]: value }))
          }
        />
        {currentFeedback && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              currentFeedback.status === "correct"
                ? "border-green-300 bg-green-50 text-green-900"
                : currentFeedback.status === "incorrect"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-amber-300 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-semibold capitalize">{currentFeedback.status}</p>
            <p className="mt-2">
              Correct answer:{" "}
              <strong>{currentFeedback.correct_answer}</strong>
            </p>
            <p className="mt-2">{currentFeedback.explanation}</p>
          </div>
        )}
        {checkMutation.isError && (
          <p className="text-sm text-danger">
            {checkMutation.error instanceof ApiError
              ? checkMutation.error.message
              : "Could not check the answer."}
          </p>
        )}
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {questions.map((item, itemIndex) => {
          const checked = Boolean(feedback[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`min-h-11 min-w-11 rounded-lg border px-3 ${
                itemIndex === index
                  ? "border-brand-primary bg-brand-primary text-white"
                  : checked
                    ? feedback[item.id]?.status === "correct"
                      ? "border-green-300 bg-green-50"
                      : "border-red-300 bg-red-50"
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
          onClick={() => setIndex((value) => value - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={checkMutation.isPending}
          onClick={() => checkMutation.mutate()}
        >
          {checkMutation.isPending ? "Checking…" : "Check Answer"}
        </button>
        {index < questions.length - 1 ? (
          <button
            type="button"
            className="min-h-11 rounded-xl border px-4"
            onClick={() => setIndex((value) => value + 1)}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await presentPerfectApi.submitPractice(sessionId);
                window.location.href = `/student/practice/present_perfect/results/${sessionId}/review`;
              } catch {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Finishing…" : "Finish Practice"}
          </button>
        )}
      </div>
    </AppShell>
  );
}

export function PresentPerfectPracticeResultPage() {
  const { sessionId = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["present-perfect-practice-result", sessionId],
    queryFn: () => presentPerfectApi.practiceResult(sessionId),
    enabled: Boolean(sessionId),
  });

  if (isError) {
    return (
      <AppShell title="Practice Result">
        <section className="card space-y-4">
          <p className="text-danger">
            {error instanceof ApiError
              ? error.message
              : "Result could not be loaded."}
          </p>
          <button type="button" className="btn-primary" onClick={() => void refetch()}>
            Try Again
          </button>
        </section>
      </AppShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Practice Result">
        <p>Loading result…</p>
      </AppShell>
    );
  }

  return <PracticeResultView result={data} sessionId={sessionId} />;
}

function PracticeResultView({
  result,
  sessionId,
}: {
  result: PresentPerfectResult;
  sessionId: string;
}) {
  return (
    <AppShell title="Practice Result">
      <div className="space-y-4">
        <section className="card space-y-3">
          <h2 className="text-2xl font-bold">Practice complete</h2>
          <p className="text-4xl font-bold text-brand-primary">
            {(result.percentage ?? 0).toFixed(1)}%
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <p>Score: {(result.score_out_of_ten ?? 0).toFixed(1)} / 10</p>
            <p>Correct: {result.correct_answers ?? 0}</p>
            <p>Incorrect: {result.incorrect_answers ?? 0}</p>
            <p>Unanswered: {result.unanswered_answers ?? 0}</p>
          </div>
          <p className="text-sm text-gray-600">
            This practice session does not count as an exam attempt.
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/student/practice/present_perfect/results/${sessionId}/review`}
            className="btn-primary"
          >
            Review Answers
          </Link>
          <Link to="/student/practice/present_perfect/start" className="btn-primary">
            Practice Again
          </Link>
          <Link to="/student/practice" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Practice
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

export function PresentPerfectPracticeReviewPage() {
  const { sessionId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["present-perfect-practice-result", sessionId],
    queryFn: () => presentPerfectApi.practiceResult(sessionId),
    enabled: Boolean(sessionId),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Practice Review">
        <p>Loading review…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Practice Review">
      <div className="space-y-4">
        {data.questions.map((question) => (
          <article
            key={question.id}
            className={`card border-l-4 ${
              question.status === "correct"
                ? "border-l-green-600"
                : question.status === "incorrect"
                  ? "border-l-red-600"
                  : "border-l-amber-500"
            }`}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">
                Question {question.position}: {question.question}
              </h2>
              <span className="font-semibold capitalize">{question.status}</span>
            </div>
            <p className="mt-3">
              Your answer: <strong>{question.answer || "Unanswered"}</strong>
            </p>
            <p>
              Correct answer:{" "}
              <strong className="text-success">{question.correct_answer}</strong>
            </p>
            <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
              {question.explanation}
            </p>
          </article>
        ))}
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/student/practice/present_perfect/results/${sessionId}`}
            className="btn-primary"
          >
            Back to Result
          </Link>
          <Link to="/student/practice" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Practice
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
