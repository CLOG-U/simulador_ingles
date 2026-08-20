import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell, studentNav } from "../../components/AppShell";
import {
  examApi,
  pastSimpleApi,
  presentSimpleApi,
  verbBaseApi,
} from "../../lib/endpoints";
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

function ModuleCard({
  title,
  description,
  to,
  cta,
}: {
  title: string;
  description: string;
  to: string;
  cta: string;
}) {
  return (
    <section className="card flex h-full flex-col">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 flex-1 text-sm text-gray-600">{description}</p>
      <Link to={to} className="btn-primary mt-4">
        {cta}
      </Link>
    </section>
  );
}

/** Student home: choose between Exámenes and Práctica. */
export function StudentDashboard() {
  const { user } = useAuth();

  return (
    <AppShell title="Inicio" nav={studentNav}>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold">Hola, {user?.full_name}</h2>
          <p className="mt-1 text-gray-600">Elige un módulo para continuar.</p>
        </section>
        <div className="grid gap-5 md:grid-cols-2">
          <ModuleCard
            title="Exámenes"
            description="Evaluaciones oficiales: Verb Exam, Verb Base Form, Past Simple y Present Simple."
            to="/student/exams"
            cta="Ir a Exámenes"
          />
          <ModuleCard
            title="Práctica"
            description="Sesiones de práctica con feedback. No cuentan como intento de examen."
            to="/student/practice"
            cta="Ir a Práctica"
          />
        </div>
      </div>
    </AppShell>
  );
}

/** Exámenes module: Verb Exam + Verb Base + Past/Present Simple. */
export function StudentExamsPage() {
  const verbConfigQuery = useQuery({
    queryKey: ["exam-config", "verb_exam"],
    queryFn: examApi.config,
  });
  const verbStatusQuery = useQuery({
    queryKey: ["attempt-status", "verb_exam"],
    queryFn: examApi.attemptStatus,
  });
  const verbBaseConfigQuery = useQuery({
    queryKey: ["exam-config", "verb_base_exam"],
    queryFn: verbBaseApi.config,
  });
  const verbBaseStatusQuery = useQuery({
    queryKey: ["attempt-status", "verb_base_exam"],
    queryFn: verbBaseApi.attemptStatus,
  });
  const pastConfigQuery = useQuery({
    queryKey: ["exam-config", "past_simple_exam"],
    queryFn: pastSimpleApi.config,
  });
  const pastStatusQuery = useQuery({
    queryKey: ["attempt-status", "past_simple_exam"],
    queryFn: pastSimpleApi.attemptStatus,
  });
  const presentConfigQuery = useQuery({
    queryKey: ["exam-config", "present_simple_exam"],
    queryFn: presentSimpleApi.config,
  });
  const presentStatusQuery = useQuery({
    queryKey: ["attempt-status", "present_simple_exam"],
    queryFn: presentSimpleApi.attemptStatus,
  });

  return (
    <AppShell title="Exámenes" nav={studentNav}>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold">Exámenes</h2>
          <p className="mt-1 text-gray-600">
            Selecciona un examen oficial. Los intentos quedan registrados.
          </p>
        </section>
        <div className="grid gap-5 md:grid-cols-2">
          <ExamCard
            title="Verb Exam"
            description="Completa la forma base, el pasado y el significado en español de verbos en inglés."
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
            title="Verb Base Form"
            description="Escribe solo la forma base del verbo a partir del español o del pasado."
            config={verbBaseConfigQuery.data}
            status={verbBaseStatusQuery.data}
            isLoading={
              verbBaseConfigQuery.isLoading || verbBaseStatusQuery.isLoading
            }
            isError={verbBaseConfigQuery.isError || verbBaseStatusQuery.isError}
            onRetry={() => {
              void verbBaseConfigQuery.refetch();
              void verbBaseStatusQuery.refetch();
            }}
            instructionsPath="/student/exams/verb_base_exam/instructions"
            examPath={(id) => `/student/exams/verb_base_exam/attempts/${id}`}
            resultPath={(id) => `/student/exams/verb_base_exam/results/${id}`}
          />
          <ExamCard
            title="Past Simple Exam"
            description="Evalúa preguntas, respuestas cortas, verbos y palabras interrogativas en Past Simple."
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
          <ExamCard
            title="Present Simple Exam"
            description="Evalúa afirmativas, negativas, interrogativas, orden e identificación en Present Simple."
            config={presentConfigQuery.data}
            status={presentStatusQuery.data}
            isLoading={
              presentConfigQuery.isLoading || presentStatusQuery.isLoading
            }
            isError={presentConfigQuery.isError || presentStatusQuery.isError}
            onRetry={() => {
              void presentConfigQuery.refetch();
              void presentStatusQuery.refetch();
            }}
            instructionsPath="/student/exams/present_simple_exam/instructions"
            examPath={(id) =>
              `/student/exams/present_simple_exam/attempts/${id}`
            }
            resultPath={(id) =>
              `/student/exams/present_simple_exam/results/${id}`
            }
          />
        </div>
      </div>
    </AppShell>
  );
}

/** Práctica module: Past Simple Practice. */
export function StudentPracticePage() {
  const pastConfigQuery = useQuery({
    queryKey: ["exam-config", "past_simple_exam"],
    queryFn: pastSimpleApi.config,
  });
  const practiceStatusQuery = useQuery({
    queryKey: ["attempt-status", "past_simple_practice"],
    queryFn: pastSimpleApi.practiceStatus,
  });

  const practiceAvailable = practiceStatusQuery.data?.is_available ?? false;
  const practiceOpen =
    practiceStatusQuery.data?.has_open_attempt &&
    practiceStatusQuery.data.open_attempt_id;
  const practiceSubmitted = practiceStatusQuery.data?.submitted_count ?? 0;

  return (
    <AppShell title="Práctica" nav={studentNav}>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold">Práctica</h2>
          <p className="mt-1 text-gray-600">
            Entrena con feedback inmediato. No cuenta como intento de examen.
          </p>
        </section>
        <div className="grid gap-5 md:grid-cols-2">
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
              Sessions completed: {practiceSubmitted}
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
                to={`/student/practice/past_simple/sessions/${practiceStatusQuery.data!.open_attempt_id}`}
                className="btn-primary mt-4"
              >
                Resume Practice
              </Link>
            ) : (
              <Link
                to="/student/practice/past_simple"
                className="btn-primary mt-4"
              >
                Start Practice
              </Link>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
