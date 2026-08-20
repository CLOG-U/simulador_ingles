import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { TopicPerformance } from "../../lib/types";

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "En curso",
  SUBMITTED: "Entregado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  correct: "Correcto",
  incorrect: "Incorrecto",
  unanswered: "Sin responder",
  pendiente: "Pendiente",
};

export function formatReportDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} s`;
}

export function GradeOverrideButtons({
  current,
  disabled,
  onSet,
}: {
  current: boolean | null | undefined;
  disabled?: boolean;
  onSet: (correct: boolean) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${
          current === true
            ? "bg-green-600 text-white"
            : "border border-green-300 text-green-800"
        }`}
        disabled={disabled || current === true}
        onClick={() => onSet(true)}
      >
        Marcar correcta
      </button>
      <button
        type="button"
        className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${
          current === false
            ? "bg-red-600 text-white"
            : "border border-red-300 text-red-800"
        }`}
        disabled={disabled || current === false}
        onClick={() => onSet(false)}
      >
        Marcar incorrecta
      </button>
    </div>
  );
}

export function ReportStatusBadge({
  correct,
  label,
}: {
  correct?: boolean | null;
  label?: string;
}) {
  const text =
    label ??
    (correct === true
      ? "Correcto"
      : correct === false
        ? "Incorrecto"
        : "Sin responder");
  const tone =
    correct === true
      ? "bg-green-100 text-green-800"
      : correct === false
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {STATUS_LABELS[text.toLowerCase()] ?? text}
    </span>
  );
}

type ReportHeaderProps = {
  studentName: string;
  studentUsername: string;
  studentId?: string;
  examName: string;
  attemptLabel?: string;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds?: number | null;
  status?: string;
  percentage: number | null;
  scoreOutOfTen?: number | null;
  passed: boolean | null;
  correct: number | null | undefined;
  incorrect: number | null | undefined;
  unanswered: number | null | undefined;
  correctLabel?: string;
};

export function AttemptReportHeader({
  studentName,
  studentUsername,
  studentId,
  examName,
  attemptLabel,
  startedAt,
  submittedAt,
  durationSeconds,
  status,
  percentage,
  scoreOutOfTen,
  passed,
  correct,
  incorrect,
  unanswered,
  correctLabel = "Correctas",
}: ReportHeaderProps) {
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="text-xl font-semibold">
          {studentId ? (
            <Link
              to={`/admin/students/${studentId}/report`}
              className="text-brand-primary underline"
            >
              {studentName} ({studentUsername})
            </Link>
          ) : (
            `${studentName} (${studentUsername})`
          )}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {examName}
          {attemptLabel ? ` · ${attemptLabel}` : ""}
        </p>
        <p className="text-sm text-gray-600">
          Inicio: {formatReportDate(startedAt)} · Entrega:{" "}
          {formatReportDate(submittedAt)}
        </p>
        <p className="text-sm text-gray-600">
          Tiempo utilizado: {formatDuration(durationSeconds)}
          {status ? ` · Estado: ${STATUS_LABELS[status] ?? status}` : ""}
        </p>
      </div>

      {passed == null && percentage == null ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Este intento aún no ha sido entregado. Se muestran las respuestas
          registradas hasta el momento.
        </p>
      ) : (
        <>
          <h3 className="text-xl font-bold">
            {passed ? "Aprobado" : "No aprobado"}
          </h3>
          <p className="text-3xl font-bold text-brand-primary">
            {percentage != null ? `${percentage.toFixed(1)}%` : "—"}
            {scoreOutOfTen != null ? ` · ${scoreOutOfTen.toFixed(1)} / 10` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <p>
              {correctLabel}: {correct ?? "—"}
            </p>
            <p>Incorrectas: {incorrect ?? "—"}</p>
            <p>Sin responder: {unanswered ?? "—"}</p>
          </div>
        </>
      )}
    </section>
  );
}

export function TopicPerformanceCard({
  rows,
  strongTopics,
  topicsToReview,
}: {
  rows: TopicPerformance[];
  strongTopics?: string[];
  topicsToReview?: string[];
}) {
  if (!rows.length) return null;
  return (
    <section className="card">
      <h2 className="mb-3 text-lg font-semibold">Rendimiento por tema</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">Tema</th>
              <th>Correctas</th>
              <th>Incorrectas</th>
              <th>Sin responder</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((topic) => (
              <tr key={topic.topic} className="border-b">
                <td className="py-2">{topic.topic_label}</td>
                <td>{topic.correct}</td>
                <td>{topic.incorrect}</td>
                <td>{topic.unanswered}</td>
                <td>{topic.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(strongTopics || topicsToReview) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-green-50 p-3">
            <h3 className="font-semibold text-green-800">Temas dominados</h3>
            <p className="mt-1 text-sm">
              {strongTopics?.join(", ") || "Ninguno todavía"}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <h3 className="font-semibold text-amber-900">Temas por reforzar</h3>
            <p className="mt-1 text-sm">
              {topicsToReview?.join(", ") || "Ninguno"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function QuestionReviewSection({
  children,
  hint = "Puedes marcar una pregunta como correcta o incorrecta; el porcentaje se recalcula al instante.",
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Detalle de respuestas</h2>
      <p className="text-sm text-gray-600">{hint}</p>
      {children}
    </section>
  );
}

export function QuestionReviewCard({
  title,
  badge,
  meta,
  studentAnswer,
  expectedAnswer,
  explanation,
  tone,
  actions,
}: {
  title: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  studentAnswer?: ReactNode;
  expectedAnswer?: ReactNode;
  explanation?: ReactNode;
  tone?: "correct" | "incorrect" | "neutral";
  actions?: ReactNode;
}) {
  const border =
    tone === "correct"
      ? "border-green-200 bg-green-50/40"
      : tone === "incorrect"
        ? "border-red-200 bg-red-50/40"
        : "border-brand-primary/10 bg-white";

  return (
    <article className={`card space-y-2 border text-sm ${border}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {badge}
      </div>
      {meta}
      {studentAnswer != null && (
        <p>
          <span className="text-gray-600">Respuesta del estudiante:</span>{" "}
          <strong>{studentAnswer}</strong>
        </p>
      )}
      {expectedAnswer != null && (
        <p>
          <span className="text-gray-600">Respuesta correcta:</span>{" "}
          <strong className="text-success">{expectedAnswer}</strong>
        </p>
      )}
      {explanation}
      {actions}
    </article>
  );
}

export function AttemptReportFooter({ links }: { links: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{links}</div>;
}
