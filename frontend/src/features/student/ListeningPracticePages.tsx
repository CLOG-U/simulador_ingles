import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ApiError } from "../../lib/api";
import { listeningApi } from "../../lib/endpoints";
import type { ListeningClip, ListeningQuestion, ListeningResult } from "../../lib/types";

function ListeningPlayer({
  src,
  title,
}: {
  src?: string | null;
  title?: string | null;
}) {
  if (!src) return null;
  return (
    <div className="sticky top-0 z-20 mb-4 rounded-2xl border border-brand-sky/30 bg-white/95 p-3 shadow-sm backdrop-blur">
      <p className="mb-2 text-sm font-semibold text-brand-primary">
        {title || "Listening clip"}
      </p>
      <audio
        className="w-full"
        controls
        playsInline
        preload="auto"
        src={src}
      >
        Your browser does not support audio playback.
      </audio>
      <p className="mt-1 text-xs text-gray-500">
        You can play the audio as many times as you need.
      </p>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: ListeningQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  if (question.options) {
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

export function ListeningPracticeInstructionsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["listening-practice-clips"],
    queryFn: listeningApi.listClips,
  });

  return (
    <AppShell title="Listening Practice">
      <div className="space-y-5">
        <section className="card max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">Listening Practice</h2>
          <p>
            Listen to short audios and answer comprehension questions. You can
            replay each clip as many times as you need and check answers as you
            go. Practice sessions do not count as exam attempts.
          </p>
          <Link to="/student/practice" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Practice
          </Link>
        </section>

        {isError ? (
          <section className="card space-y-3">
            <p className="text-danger">
              {error instanceof ApiError
                ? error.message
                : "Listening clips could not be loaded."}
            </p>
            <button type="button" className="btn-primary" onClick={() => void refetch()}>
              Try Again
            </button>
          </section>
        ) : isLoading ? (
          <p>Loading clips…</p>
        ) : data && data.items.length === 0 ? (
          <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
            No listening clips are available yet.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {data?.items.map((clip) => (
              <ClipCard key={clip.clip_key} clip={clip} available={data.is_available} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ClipCard({
  clip,
  available,
}: {
  clip: ListeningClip;
  available: boolean;
}) {
  const canStart = available && clip.can_start;
  return (
    <section className="card flex h-full flex-col">
      <h3 className="text-lg font-semibold">{clip.title}</h3>
      <p className="mt-2 flex-1 text-sm text-gray-600">{clip.description}</p>
      <p className="mt-3 text-sm text-gray-600">
        {clip.question_count} questions · Sessions completed: {clip.submitted_count}
      </p>
      {!canStart ? (
        <p className="mt-4 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
          Practice is not enabled for your account.
        </p>
      ) : clip.has_open_attempt && clip.open_attempt_id ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={`/student/practice/listening/sessions/${clip.open_attempt_id}`}
            className="btn-primary"
          >
            Resume Practice
          </Link>
          <Link
            to={`/student/practice/listening/${clip.clip_key}/start?fresh=1`}
            className="inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold"
          >
            Start New Session
          </Link>
        </div>
      ) : (
        <Link
          to={`/student/practice/listening/${clip.clip_key}/start`}
          className="btn-primary mt-4"
        >
          Start Practice
        </Link>
      )}
    </section>
  );
}

export function ListeningPracticeStartRedirect() {
  const navigate = useNavigate();
  const { clipKey: clipKeyParam } = useParams();
  const [searchParams] = useSearchParams();
  const clipKey = clipKeyParam || searchParams.get("clip") || "leo-manta";
  const fresh = searchParams.get("fresh") === "1";
  const startedRef = useRef(false);
  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      fresh
        ? listeningApi.restartPractice(clipKey)
        : listeningApi.startPractice(clipKey),
    onSuccess: (session) => {
      navigate(`/student/practice/listening/sessions/${session.id}`, {
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
      <AppShell title="Listening Practice">
        <section className="card space-y-4">
          <p className="text-danger">
            {error instanceof ApiError
              ? error.message
              : "Practice could not be started."}
          </p>
          <Link to="/student/practice/listening" className="btn-primary">
            Back
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Listening Practice">
      <p>{isPending ? "Preparing listening questions…" : "Redirecting…"}</p>
    </AppShell>
  );
}

export function ListeningPracticeSessionPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, ListeningQuestion>>({});
  const [submitting, setSubmitting] = useState(false);
  const initializedRef = useRef<string | null>(null);

  const { data: session, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["listening-practice", sessionId],
    queryFn: () => listeningApi.getPractice(sessionId),
    enabled: Boolean(sessionId),
  });

  const questions = useMemo(
    () => session?.questions.slice().sort((a, b) => a.position - b.position) ?? [],
    [session],
  );
  const question = questions[index];
  const audioUrl = question?.audio_url || questions[0]?.audio_url;
  const clipTitle =
    session?.clip_title ||
    question?.clip_title ||
    questions[0]?.clip_title ||
    "Listening clip";
  const clipKey = session?.clip_key || "leo-manta";

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
      navigate(`/student/practice/listening/results/${session.id}/review`, {
        replace: true,
      });
    }
  }, [navigate, session?.id, session?.status]);

  const checkMutation = useMutation({
    mutationFn: () =>
      listeningApi.checkPracticeAnswer(
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
      <AppShell title="Listening Practice">
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
      <AppShell title="Listening Practice">
        <p>Loading practice…</p>
      </AppShell>
    );
  }

  const currentFeedback = feedback[question.id];
  const checkedCount = Object.keys(feedback).length;

  return (
    <AppShell title="Listening Practice">
      <ListeningPlayer src={audioUrl} title={clipTitle} />
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
                await listeningApi.submitPractice(sessionId);
                window.location.href = `/student/practice/listening/results/${sessionId}/review`;
              } catch {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Finishing…" : "Finish Practice"}
          </button>
        )}
        <Link
          to={`/student/practice/listening/${clipKey}/start?fresh=1`}
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

export function ListeningPracticeResultPage() {
  const { sessionId = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["listening-practice-result", sessionId],
    queryFn: () => listeningApi.practiceResult(sessionId),
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
  result: ListeningResult;
  sessionId: string;
}) {
  const clip = result.questions[0];
  return (
    <AppShell title="Practice Result">
      <div className="space-y-4">
        <ListeningPlayer src={clip?.audio_url} title={clip?.clip_title} />
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
            This listening session does not count as an exam attempt.
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/student/practice/listening/results/${sessionId}/review`}
            className="btn-primary"
          >
            Review answers
          </Link>
          <Link
            to={`/student/practice/listening/${result.clip_key || "leo-manta"}/start?fresh=1`}
            className="btn-primary"
          >
            Practice Again
          </Link>
          <Link to="/student/practice/listening" className="inline-flex rounded-xl border px-4 py-2.5">
            Back to Listening
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

export function ListeningPracticeReviewPage() {
  const { sessionId = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["listening-practice-result", sessionId],
    queryFn: () => listeningApi.practiceResult(sessionId),
    enabled: Boolean(sessionId),
  });

  if (isError) {
    return (
      <AppShell title="Practice Review">
        <section className="card space-y-4">
          <p className="text-danger">
            {error instanceof ApiError
              ? error.message
              : "Review could not be loaded."}
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
      <AppShell title="Practice Review">
        <p>Loading review…</p>
      </AppShell>
    );
  }

  const clip = data.questions[0];

  return (
    <AppShell title="Practice Review">
      <ListeningPlayer src={clip?.audio_url} title={clip?.clip_title} />
      <div className="space-y-4">
        {data.questions.map((question) => (
          <article
            key={question.id}
            className={`card border ${
              question.status === "correct"
                ? "border-green-200"
                : question.status === "incorrect"
                  ? "border-red-200"
                  : "border-amber-200"
            }`}
          >
            <p className="text-sm text-gray-600">Question {question.position}</p>
            <h3 className="mt-1 font-semibold">{question.question}</h3>
            <div className="mt-3">
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
            to={`/student/practice/listening/results/${sessionId}`}
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
