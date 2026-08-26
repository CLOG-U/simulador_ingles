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
  TopicPerformanceCard,
} from "./AdminAttemptReportLayout";

const TOPIC_LABELS: Record<string, string> = {
  detail: "Detail",
  main_idea: "Main idea",
  present_simple: "Present Simple",
  past_simple: "Past Simple",
  present_perfect: "Present Perfect",
};

export function AdminListeningAttemptReportPage() {
  const { attemptId = "" } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-listening-report", attemptId],
    queryFn: () => adminApi.listeningAttemptReport(attemptId),
    enabled: Boolean(attemptId),
  });

  const overrideMutation = useMutation({
    mutationFn: ({
      questionId,
      correct,
    }: {
      questionId: string;
      correct: boolean;
    }) => adminApi.overrideListeningGrade(attemptId, questionId, correct),
    onSuccess: (next) => {
      queryClient.setQueryData(["admin-listening-report", attemptId], next);
    },
  });

  const audioUrl = data?.questions[0]?.audio_url;
  const clipTitle = data?.questions[0]?.clip_title || "Leo in Manta";

  return (
    <AppShell title="Reporte Listening Practice" nav={adminNav}>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
      >
        {data && (
          <div className="space-y-5">
            <AttemptReportHeader
              studentName={data.student_name}
              studentUsername={data.student_username}
              studentId={data.student_id}
              examName={data.exam_name ?? "Listening Practice"}
              attemptLabel={`Sesión ${data.attempt_number}`}
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

            {audioUrl && (
              <section className="card space-y-2">
                <h3 className="font-semibold">{clipTitle}</h3>
                <audio className="w-full" controls playsInline src={audioUrl}>
                  El navegador no reproduce este audio.
                </audio>
              </section>
            )}

            <TopicPerformanceCard
              rows={data.topic_performance}
              strongTopics={data.observation.strong_topics}
              topicsToReview={data.observation.topics_to_review}
            />

            <QuestionReviewSection>
              {data.questions.map((question) => (
                <QuestionReviewCard
                  key={question.id}
                  title={`${question.position}. ${question.question}`}
                  badge={
                    <ReportStatusBadge
                      correct={question.is_correct}
                      label={question.status}
                    />
                  }
                  meta={
                    <>
                      <p className="text-gray-600">
                        Tema: {TOPIC_LABELS[question.topic] ?? question.topic}
                      </p>
                      {question.options && (
                        <p className="text-gray-600">
                          Opciones: {question.options.join(" · ")}
                        </p>
                      )}
                    </>
                  }
                  studentAnswer={question.answer || "Sin responder"}
                  expectedAnswer={
                    question.correct_answer ?? "Disponible al entregar"
                  }
                  explanation={
                    question.explanation ? (
                      <p className="rounded-lg bg-gray-50 p-3">
                        {question.explanation}
                      </p>
                    ) : null
                  }
                  tone={
                    question.is_correct === true
                      ? "correct"
                      : question.is_correct === false
                        ? "incorrect"
                        : "neutral"
                  }
                  actions={
                    data.status === "SUBMITTED" ? (
                      <GradeOverrideButtons
                        current={question.is_correct}
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
              ))}
            </QuestionReviewSection>

            <AttemptReportFooter
              links={
                <>
                  <Link
                    to={`/admin/students/${data.student_id}/report`}
                    className="btn-primary"
                  >
                    Reporte general
                  </Link>
                  <Link
                    to={`/admin/students/${data.student_id}/practice/listening`}
                    className="inline-flex rounded-xl border px-4 py-2.5"
                  >
                    Reporte Practice
                  </Link>
                  <Link
                    to="/admin/practice/listening"
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
