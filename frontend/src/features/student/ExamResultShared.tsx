import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";

export function formatExamDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export type ReviewStatus = "correct" | "incorrect" | "unanswered";

export function statusFromCorrect(value: boolean | null | undefined): ReviewStatus {
  if (value === true) return "correct";
  if (value === false) return "incorrect";
  return "unanswered";
}

type ResultSummaryProps = {
  studentName?: string | null;
  examName: string;
  attemptNumber?: number | null;
  submittedAt?: string | null;
  passed: boolean | null | undefined;
  percentage: number | null | undefined;
  scoreOutOfTen?: number | null;
  correct: number | null | undefined;
  incorrect: number | null | undefined;
  unanswered: number | null | undefined;
  correctLabel?: string;
};

export function ExamResultSummary({
  studentName,
  examName,
  attemptNumber,
  submittedAt,
  passed,
  percentage,
  scoreOutOfTen,
  correct,
  incorrect,
  unanswered,
  correctLabel = "Correct",
}: ResultSummaryProps) {
  return (
    <section className="card space-y-3">
      <div>
        {studentName ? <p className="text-sm text-gray-600">{studentName}</p> : null}
        <p className="text-sm text-gray-600">
          {examName}
          {attemptNumber != null ? ` · Attempt ${attemptNumber}` : ""}
          {submittedAt ? ` · ${formatExamDate(submittedAt)}` : ""}
        </p>
      </div>
      <h2 className="text-2xl font-bold">{passed ? "Passed" : "Not Passed"}</h2>
      <p className="text-4xl font-bold text-brand-primary">
        {(percentage ?? 0).toFixed(1)}%
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <p>
          Score:{" "}
          {(scoreOutOfTen ?? (percentage != null ? percentage / 10 : 0)).toFixed(1)} / 10
        </p>
        <p>
          {correctLabel}: {correct ?? 0}
        </p>
        <p>Incorrect: {incorrect ?? 0}</p>
        <p>Unanswered: {unanswered ?? 0}</p>
      </div>
    </section>
  );
}

export function ExamReviewCard({
  position,
  title,
  status,
  meta,
  studentAnswer,
  correctAnswer,
  explanation,
  fields,
}: {
  position: number;
  title: string;
  status: ReviewStatus;
  meta?: ReactNode;
  studentAnswer?: ReactNode;
  correctAnswer?: ReactNode;
  explanation?: ReactNode;
  fields?: Array<{
    label: string;
    student: ReactNode;
    expected: ReactNode;
    status: ReviewStatus;
  }>;
}) {
  const border =
    status === "correct"
      ? "border-l-green-600"
      : status === "incorrect"
        ? "border-l-red-600"
        : "border-l-amber-500";

  return (
    <article className={`card border-l-4 ${border}`}>
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-semibold">
          Question {position}: {title}
        </h2>
        <span className="font-semibold capitalize">{status}</span>
      </div>
      {meta ? <div className="mt-2 text-sm text-gray-600">{meta}</div> : null}
      {fields ? (
        <ul className="mt-3 space-y-3">
          {fields.map((field) => (
            <li key={field.label} className="rounded-lg border border-gray-100 bg-white p-3">
              <p className="font-medium capitalize">{field.label}</p>
              <p className="mt-1">
                Student answer: <strong>{field.student}</strong>
              </p>
              <p>
                Correct answer: <strong className="text-success">{field.expected}</strong>
              </p>
              <p className="mt-1 text-xs font-semibold capitalize text-gray-600">
                {field.status}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="mt-3">
            Student answer: <strong>{studentAnswer ?? "Unanswered"}</strong>
          </p>
          <p>
            Correct answer:{" "}
            <strong className="text-success">{correctAnswer ?? "—"}</strong>
          </p>
        </>
      )}
      {explanation ? (
        <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">{explanation}</div>
      ) : null}
    </article>
  );
}

export function ExamResultActions({
  reviewPath,
  backPath = "/student/exams",
  showReview,
}: {
  reviewPath?: string;
  backPath?: string;
  showReview?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {showReview && reviewPath ? (
        <Link to={reviewPath} className="btn-primary">
          Review Answers
        </Link>
      ) : null}
      <Link to={backPath} className="inline-flex rounded-xl border px-4 py-2.5">
        Back to Exams
      </Link>
    </div>
  );
}

export function ExamReviewActions({
  resultPath,
  backPath = "/student/exams",
}: {
  resultPath: string;
  backPath?: string;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link to={resultPath} className="btn-primary">
        Back to Result
      </Link>
      <Link to={backPath} className="inline-flex rounded-xl border px-4 py-2.5">
        Back to Exams
      </Link>
    </div>
  );
}

export function ExamResultShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <AppShell title={title}>
      <div className="space-y-4">{children}</div>
    </AppShell>
  );
}
