import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ApiError } from "../../lib/api";
import { verbPastApi } from "../../lib/endpoints";
import type { ExamQuestion, VerbBaseResult } from "../../lib/types";

function gradeStatus(question: ExamQuestion | undefined): string | undefined {
  if (!question) return undefined;
  if (question.status) return question.status;
  if (question.grades?.base === true) return "correct";
  if (question.grades?.base === false) return "incorrect";
  if (question.fully_correct === true) return "correct";
  if (question.fully_correct === false) return "incorrect";
  return undefined;
}

export function VerbPastPracticeInstructionsPage() {
  const { data: status } = useQuery({
    queryKey: ["verb-past-practice-status"],
    queryFn: verbPastApi.practiceStatus,
  });

  return (
    <AppShell title="Verb Past Form Practice">
      <section className="card max-w-2xl space-y-4">
        <h2 className="text-xl font-semibold">Verb Past Form Practice</h2>
        <p>
          Practice the past form of English verbs. We show you Spanish or the
          base form; you write the past. You will get immediate feedback after
          each answer. Practice sessions do not count as exam attempts.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>Verb bank: {status?.question_bank_size ?? "—"} active verbs</li>
          <li>Each practice session: 20 questions</li>
          <li>Check answers as you go</li>
          <li>Unlimited practice sessions</li>
          <li>Sessions completed: {status?.submitted_count ?? 0}</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          {status?.has_open_attempt && status.open_attempt_id ? (
            <>
              <Link
                to={`/student/practice/verb_past/sessions/${status.open_attempt_id}`}
                className="btn-primary"
              >
                Resume Practice
              </Link>
              <Link
                to="/student/practice/verb_past/start?fresh=1"
                className="inline-flex rounded-xl border px-4 py-2.5 font-semibold"
              >
                Start New Session
              </Link>
            </>
          ) : status?.can_start_new ? (
            <Link to="/student/practice/verb_past/start" className="btn-primary">
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

export function VerbPastPracticeStartRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fresh = searchParams.get("fresh") === "1";
  const startedRef = useRef(false);
  const { mutate, isPending, error } = useMutation({
    mutationFn: fresh ? verbPastApi.restartPractice : verbPastApi.startPractice,
    onSuccess: (session) => {
      navigate(`/student/practice/verb_past/sessions/${session.id}`, {
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
      <AppShell title="Verb Past Form Practice">
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
    <AppShell title="Verb Past Form Practice">
      <p>{isPending ? "Preparing questions…" : "Redirecting…"}</p>
    </AppShell>
  );
}

export function VerbPastPracticeSessionPage() {
  const { sessionId = "" } = useParams();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, ExamQuestion>>({});
  const [submitting, setSubmitting] = useState(false);
  const initializedRef = useRef<string | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ["verb-past-practice", sessionId],
    queryFn: () => verbPastApi.getPractice(sessionId),
    enabled: Boolean(sessionId),
  });

  const questions = useMemo(
    () => session?.questions.slice().sort((a, b) => a.position - b.position) ?? [],
    [session],
  );
  const question = questions[index];
  const currentFeedback = question ? feedback[question.id] : undefined;
  const checkedCount = Object.keys(feedback).length;

  useEffect(() => {
    if (!session || initializedRef.current === session.id) return;
    const initial = Object.fromEntries(
      session.questions.map((item) => [item.id, item.answers.base ?? ""]),
    );
    setAnswers(initial);
    const initialFeedback = Object.fromEntries(
      session.questions
        .filter((item) => item.grades?.base != null || item.status)
        .map((item) => [item.id, item]),
    );
    setFeedback(initialFeedback);
    initializedRef.current = session.id;
  }, [session]);

  const checkMutation = useMutation({
    mutationFn: () => {
      if (!question) throw new Error("Missing question");
      return verbPastApi.checkPracticeAnswer(
        sessionId,
        question.id,
        answers[question.id] ?? "",
      );
    },
    onSuccess: (checked) => {
      setFeedback((prev) => ({ ...prev, [checked.id]: checked }));
    },
  });

  if (isLoading || !session || !question) {
    return (
      <AppShell title="Verb Past Form Practice">
        <p>Loading questions…</p>
      </AppShell>
    );
  }

  const answerField =
    question.required_fields[0] ?? {
      field: "BASE",
      label: "past form in English",
    };
  const feedbackStatus = gradeStatus(currentFeedback);

  return (
    <AppShell title="Verb Past Form Practice">
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
        <p className="text-sm font-medium text-brand-purple">{question.prompt_label}</p>
        <p className="text-2xl font-bold text-brand-primary">{question.shown_value}</p>
        <div>
          <label htmlFor={`${question.id}-practice`} className="mb-1 block text-sm font-medium">
            {answerField.label}
          </label>
          <input
            id={`${question.id}-practice`}
            value={answers[question.id] ?? ""}
            onChange={(event) =>
              setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
            }
            autoComplete="off"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky"
          />
        </div>
        {currentFeedback && feedbackStatus && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              feedbackStatus === "correct"
                ? "border-green-300 bg-green-50 text-green-900"
                : feedbackStatus === "incorrect"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-amber-300 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-semibold capitalize">{feedbackStatus}</p>
            <p className="mt-2">
              Correct answer:{" "}
              <strong>
                {currentFeedback.correct_answer ?? currentFeedback.expected?.base}
              </strong>
            </p>
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
          const status = gradeStatus(feedback[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`min-h-11 min-w-11 rounded-lg border px-3 ${
                itemIndex === index
                  ? "border-brand-primary bg-brand-primary text-white"
                  : checked
                    ? status === "correct"
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
                await verbPastApi.submitPractice(sessionId);
                window.location.href = `/student/practice/verb_past/results/${sessionId}/review`;
              } catch {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Finishing…" : "Finish Practice"}
          </button>
        )}
        <Link
          to="/student/practice/verb_past/start?fresh=1"
          className="inline-flex min-h-11 items-center rounded-xl border px-4"
          onClick={(event) => {
            if (
              !window.confirm(
                "Start a new practice session? Your current progress will be discarded.",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          New Session
        </Link>
      </div>
    </AppShell>
  );
}

export function VerbPastPracticeResultPage() {
  const { sessionId = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["verb-past-practice-result", sessionId],
    queryFn: () => verbPastApi.practiceResult(sessionId),
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
  result: VerbBaseResult;
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
            to={`/student/practice/verb_past/results/${sessionId}/review`}
            className="btn-primary"
          >
            Review Answers
          </Link>
          <Link to="/student/practice/verb_past/start?fresh=1" className="btn-primary">
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

export function VerbPastPracticeReviewPage() {
  const { sessionId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["verb-past-practice-result", sessionId],
    queryFn: () => verbPastApi.practiceResult(sessionId),
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
        {data.questions.map((question) => {
          const status = gradeStatus(question) ?? "unanswered";
          return (
            <article
              key={question.id}
              className={`card border-l-4 ${
                status === "correct"
                  ? "border-l-green-600"
                  : status === "incorrect"
                    ? "border-l-red-600"
                    : "border-l-amber-500"
              }`}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="font-semibold">
                  Question {question.position}: {question.prompt_label}{" "}
                  {question.shown_value}
                </h2>
                <span className="font-semibold capitalize">{status}</span>
              </div>
              <p className="mt-3">
                Your answer: <strong>{question.answers.base || "Unanswered"}</strong>
              </p>
              <p>
                Correct answer:{" "}
                <strong className="text-success">
                  {question.correct_answer ?? question.expected?.base ?? "—"}
                </strong>
              </p>
            </article>
          );
        })}
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/student/practice/verb_past/results/${sessionId}`}
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
