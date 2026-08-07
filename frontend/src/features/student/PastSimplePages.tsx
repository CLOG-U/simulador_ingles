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

const SAVE_DEBOUNCE_MS = 1000;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
          <Link to="/student" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Exams
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export function PastSimpleStartRedirect() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["past-simple-attempt-start"],
    queryFn: pastSimpleApi.startAttempt,
    retry: false,
  });

  useEffect(() => {
    if (data?.id) {
      navigate(`/student/exams/past_simple_exam/attempts/${data.id}`, {
        replace: true,
      });
    }
  }, [data, navigate]);

  if (error) {
    return (
      <AppShell title="Past Simple Exam">
        <section className="card space-y-4">
          <p className="text-danger">
            {error instanceof ApiError
              ? error.message
              : "The exam could not be started. Please try again later."}
          </p>
          <Link to="/student" className="btn-primary">
            Back to Exams
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Past Simple Exam">
      <p>{isLoading ? "Preparing your questions…" : "Redirecting…"}</p>
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
  const queryClient = useQueryClient();

  const { data: attempt, isLoading } = useQuery({
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
      navigate(`/student/exams/past_simple_exam/results/${attempt.id}`, {
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
        void pastSimpleApi.submit(attempt.id).finally(() => {
          window.location.href = `/student/exams/past_simple_exam/results/${attempt.id}`;
        });
      }
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [attempt?.expires_at, attempt?.id, attempt?.status]);

  const saveMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      pastSimpleApi.saveAnswer(attemptId, questionId, answer || null),
    onSuccess: (_data, variables) => {
      savedRef.current[variables.questionId] = variables.answer;
      setSaveLabel("Saved");
      queryClient.setQueryData<PastSimpleAttempt>(
        ["past-simple-attempt", attemptId],
        (old) =>
          old
            ? {
                ...old,
                questions: old.questions.map((item) =>
                  item.id === variables.questionId
                    ? { ...item, answer: variables.answer || null }
                    : item,
                ),
              }
            : old,
      );
    },
    onError: () => setSaveLabel("Not saved"),
  });

  const flushSave = useCallback(
    async (questionId: string) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const answer = answersRef.current[questionId] ?? "";
      if (savedRef.current[questionId] === answer) return;
      setSaveLabel("Saving…");
      await saveMutation.mutateAsync({ questionId, answer });
    },
    [saveMutation],
  );

  const updateAnswer = (questionId: string, value: string) => {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    setAnswers(next);
    setSaveLabel("");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flushSave(questionId);
    }, SAVE_DEBOUNCE_MS);
  };

  const goTo = async (nextIndex: number) => {
    if (!question || nextIndex < 0 || nextIndex >= questions.length) return;
    await flushSave(question.id);
    setIndex(nextIndex);
    setSaveLabel("");
  };

  const unanswered = questions.filter(
    (item) => !(answers[item.id] ?? item.answer ?? "").trim(),
  ).length;
  const answered = questions.length - unanswered;

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
          onBlur={() => void flushSave(question.id)}
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
              await flushSave(question.id);
              setShowSubmit(true);
            }}
          >
            Submit Exam
          </button>
        )}
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section className="card max-w-md space-y-4" role="dialog" aria-modal="true">
            <h3 className="text-lg font-semibold">Submit Past Simple Exam?</h3>
            <p>
              You have {unanswered} unanswered question{unanswered === 1 ? "" : "s"}. After
              submitting, answers cannot be changed.
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
                  for (const item of questions) await flushSave(item.id);
                  await pastSimpleApi.submit(attemptId);
                  window.location.href = `/student/exams/past_simple_exam/results/${attemptId}`;
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
    <section className="card space-y-3">
      <div>
        <p className="text-sm text-gray-600">{result.student_name}</p>
        <p className="text-sm text-gray-600">
          {result.exam_name} · Attempt {result.attempt_number} · {formatDate(result.submitted_at)}
        </p>
      </div>
      <h2 className="text-2xl font-bold">{result.passed ? "Passed" : "Not Passed"}</h2>
      <p className="text-4xl font-bold text-brand-primary">
        {(result.percentage ?? 0).toFixed(1)}%
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <p>Score: {(result.score_out_of_ten ?? 0).toFixed(1)} / 10</p>
        <p>Correct: {result.correct_answers ?? 0}</p>
        <p>Incorrect: {result.incorrect_answers ?? 0}</p>
        <p>Unanswered: {result.unanswered_answers ?? 0}</p>
      </div>
    </section>
  );
}

export function PastSimpleResultPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["past-simple-result", attemptId],
    queryFn: () => pastSimpleApi.result(attemptId),
    enabled: Boolean(attemptId),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Past Simple Exam Result">
        <p>Loading result…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Past Simple Exam Result">
      <div className="space-y-4">
        <ResultSummary result={data} />
        <div className="flex flex-wrap gap-3">
          {data.questions?.length > 0 && (
            <Link
              to={`/student/exams/past_simple_exam/results/${attemptId}/review`}
              className="btn-primary"
            >
              Review Answers
            </Link>
          )}
          <Link to="/student" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Exams
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

export function PastSimpleReviewPage() {
  const { attemptId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["past-simple-result", attemptId],
    queryFn: () => pastSimpleApi.result(attemptId),
    enabled: Boolean(attemptId),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Review Answers">
        <p>Loading review…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Review Answers">
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
            <p className="mt-2 text-sm text-gray-600">Topic: {question.topic}</p>
            <p className="mt-3">
              Student answer: <strong>{question.answer || "Unanswered"}</strong>
            </p>
            <p>
              Correct answer: <strong className="text-success">{question.correct_answer}</strong>
            </p>
            <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
              {question.explanation}
            </p>
          </article>
        ))}
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/student/exams/past_simple_exam/results/${attemptId}`}
            className="btn-primary"
          >
            Back to Result
          </Link>
          <Link to="/student" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Exams
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
