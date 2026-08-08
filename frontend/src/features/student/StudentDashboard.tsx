import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { examApi, pastSimpleApi } from "../../lib/endpoints";
import type { AttemptStatus } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";

function ExamCard({
  title,
  description,
  config,
  status,
  isLoading,
  isError,
  onRetry,
  instructionsPath,
  examPath,
  resultPath,
}: {
  title: string;
  description: string;
  config?: {
    is_enabled?: boolean;
    question_count: number;
    passing_percentage: number;
  };
  status?: AttemptStatus;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  instructionsPath: string;
  examPath: (attemptId: string) => string;
  resultPath: (attemptId: string) => string;
}) {
  if (isLoading || isError) {
    return (
      <section className="card flex h-full flex-col">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        {isLoading ? (
          <p className="mt-4 text-sm text-gray-600">Loading exam availability…</p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-danger">Exam availability could not be loaded.</p>
            <button type="button" className="btn-primary" onClick={onRetry}>
              Try Again
            </button>
          </div>
        )}
      </section>
    );
  }

  const hasOpen = status?.has_open_attempt && status.open_attempt_id;
  const available = status?.is_available ?? config?.is_enabled ?? true;
  const canStart = status?.can_start_new ?? false;
  const lastResult = status?.last_submitted;

  return (
    <section className="card flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            available
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {available ? "Available" : "Locked"}
        </span>
      </div>
      <p className="mt-2 flex-1 text-sm text-gray-600">{description}</p>
      <p className="mt-3 text-sm text-gray-600">
        {config?.question_count ?? "—"} questions · Passing score:{" "}
        {config?.passing_percentage ?? 70}%
      </p>

      {!available ? (
        <p className="mt-4 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
          This exam is not enabled for your account.
        </p>
      ) : hasOpen ? (
        <Link to={examPath(status.open_attempt_id!)} className="btn-primary mt-4">
          Resume Exam
        </Link>
      ) : canStart ? (
        <Link to={instructionsPath} className="btn-primary mt-4">
          Start Exam
        </Link>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            You already completed this exam. Contact your teacher for a new attempt.
          </p>
          {lastResult && (
            <Link to={resultPath(lastResult.id)} className="btn-primary">
              View Result ({lastResult.percentage?.toFixed(1)}%)
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export function StudentDashboard() {
  const { user } = useAuth();
  const verbConfigQuery = useQuery({
    queryKey: ["exam-config", "verb_exam"],
    queryFn: examApi.config,
  });
  const verbStatusQuery = useQuery({
    queryKey: ["attempt-status", "verb_exam"],
    queryFn: examApi.attemptStatus,
  });
  const pastConfigQuery = useQuery({
    queryKey: ["exam-config", "past_simple_exam"],
    queryFn: pastSimpleApi.config,
  });
  const pastStatusQuery = useQuery({
    queryKey: ["attempt-status", "past_simple_exam"],
    queryFn: pastSimpleApi.attemptStatus,
  });
  const practiceStatusQuery = useQuery({
    queryKey: ["attempt-status", "past_simple_practice"],
    queryFn: pastSimpleApi.practiceStatus,
  });

  const practiceStatus = practiceStatusQuery.data;
  const practiceAvailable = practiceStatus?.is_available ?? false;
  const practiceOpen =
    practiceStatus?.has_open_attempt && practiceStatus.open_attempt_id;
  const practiceCanStart = practiceStatus?.can_start_new ?? false;
  const practiceSubmitted = practiceStatus?.submitted_count ?? 0;
  const practiceMax = practiceStatus?.max_attempts;

  return (
    <AppShell title="Available Exams">
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold">Hola, {user?.full_name}</h2>
          <p className="mt-1 text-gray-600">
            Select an exam or practice session below. Practice does not count as
            an exam attempt.
          </p>
        </section>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ExamCard
            title="Verb Exam"
            description="Complete the base form, past form and Spanish meaning of English verbs."
            config={verbConfigQuery.data}
            status={verbStatusQuery.data}
            isLoading={verbConfigQuery.isLoading || verbStatusQuery.isLoading}
            isError={verbConfigQuery.isError || verbStatusQuery.isError}
            onRetry={() => {
              void verbConfigQuery.refetch();
              void verbStatusQuery.refetch();
            }}
            instructionsPath="/student/exams/verb_exam/instructions"
            examPath={(id) => `/student/exams/verb_exam/attempts/${id}`}
            resultPath={(id) => `/student/exams/verb_exam/results/${id}`}
          />
          <ExamCard
            title="Past Simple Exam"
            description="Test your knowledge of questions, short answers, verbs and question words in the Past Simple."
            config={pastConfigQuery.data}
            status={pastStatusQuery.data}
            isLoading={pastConfigQuery.isLoading || pastStatusQuery.isLoading}
            isError={pastConfigQuery.isError || pastStatusQuery.isError}
            onRetry={() => {
              void pastConfigQuery.refetch();
              void pastStatusQuery.refetch();
            }}
            instructionsPath="/student/exams/past_simple_exam/instructions"
            examPath={(id) => `/student/exams/past_simple_exam/attempts/${id}`}
            resultPath={(id) => `/student/exams/past_simple_exam/results/${id}`}
          />
          <section className="card flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">Past Simple Practice</h2>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  practiceAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {practiceAvailable ? "Available" : "Locked"}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm text-gray-600">
              Prepare for the exam with immediate feedback. Uses the same 100-question
              bank; each session picks 24 balanced questions.
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Bank: {pastConfigQuery.data?.question_bank_size ?? "—"} questions ·
              Session: 24
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Sessions: {practiceSubmitted}
              {practiceMax != null ? ` of ${practiceMax}` : ""} completed
            </p>
            {practiceStatusQuery.isLoading ? (
              <p className="mt-4 text-sm text-gray-600">Loading practice…</p>
            ) : practiceStatusQuery.isError ? (
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => void practiceStatusQuery.refetch()}
              >
                Try Again
              </button>
            ) : !practiceAvailable ? (
              <p className="mt-4 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
                Practice is not enabled for your account.
              </p>
            ) : practiceOpen ? (
              <Link
                to={`/student/practice/past_simple/sessions/${practiceStatus!.open_attempt_id}`}
                className="btn-primary mt-4"
              >
                Resume Practice
              </Link>
            ) : practiceCanStart ? (
              <Link
                to="/student/practice/past_simple"
                className="btn-primary mt-4"
              >
                Start Practice
              </Link>
            ) : (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                You already completed your practice sessions. Contact your teacher
                for a new attempt.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
