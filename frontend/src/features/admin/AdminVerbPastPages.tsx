import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";
import {
  AttemptReportFooter,
  AttemptReportHeader,
  GradeOverrideButtons,
  QuestionReviewCard,
  QuestionReviewSection,
  ReportStatusBadge,
} from "./AdminAttemptReportLayout";

export function AdminVerbPastAttemptReportPage() {
  const { attemptId = "" } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-verb-past-report", attemptId],
    queryFn: () => adminApi.verbPastAttemptReport(attemptId),
    enabled: Boolean(attemptId),
  });

  const overrideMutation = useMutation({
    mutationFn: ({
      questionId,
      correct,
    }: {
      questionId: string;
      correct: boolean;
    }) => adminApi.overrideVerbPastGrade(attemptId, questionId, correct),
    onSuccess: (next) => {
      queryClient.setQueryData(["admin-verb-past-report", attemptId], next);
    },
  });

  return (
    <AppShell title="Reporte Verb Past Form" nav={adminNav}>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
      >
        {data && (
          <div className="space-y-5">
            <AttemptReportHeader
              studentName={data.student_name ?? "—"}
              studentUsername={data.student_username ?? "—"}
              studentId={data.student_id}
              examName={data.exam_name ?? "Verb Past Form"}
              attemptLabel={
                data.attempt_number != null
                  ? `Intento ${data.attempt_number}`
                  : undefined
              }
              startedAt={data.started_at}
              submittedAt={data.submitted_at}
              durationSeconds={data.duration_seconds}
              status={data.status}
              percentage={data.percentage}
              scoreOutOfTen={data.score_out_of_ten}
              passed={data.passed}
              correct={data.correct_answers}
              incorrect={data.incorrect_answers}
              unanswered={data.unanswered_answers}
            />

            <QuestionReviewSection>
              {data.questions.map((question) => {
                const isCorrect = question.grades?.base;
                return (
                  <QuestionReviewCard
                    key={question.id}
                    title={`${question.position}. ${question.prompt_label}: ${question.shown_value}`}
                    badge={
                      isCorrect != null ? (
                        <ReportStatusBadge correct={isCorrect} />
                      ) : undefined
                    }
                    studentAnswer={question.answers.base || "Sin responder"}
                    expectedAnswer={question.expected?.base}
                    tone={
                      isCorrect === true
                        ? "correct"
                        : isCorrect === false
                          ? "incorrect"
                          : "neutral"
                    }
                    actions={
                      data.status === "SUBMITTED" ? (
                        <GradeOverrideButtons
                          current={isCorrect}
                          disabled={overrideMutation.isPending}
                          onSet={(correct) =>
                            overrideMutation.mutate({
                              questionId: question.id,
                              correct,
                            })
                          }
                        />
                      ) : null
                    }
                  />
                );
              })}
            </QuestionReviewSection>

            <AttemptReportFooter
              links={
                <>
                  {data.student_id && (
                    <Link
                      to={`/admin/students/${data.student_id}/report`}
                      className="btn-primary"
                    >
                      Reporte general
                    </Link>
                  )}
                  <Link
                    to="/admin/exams/verb-past"
                    className="inline-flex rounded-xl border px-4 py-2.5"
                  >
                    Volver al módulo
                  </Link>
                </>
              }
            />
          </div>
        )}
      </QueryState>
    </AppShell>
  );
}
