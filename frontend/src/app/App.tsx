import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RequireAuth } from "../components/RequireAuth";
import { AuthProvider } from "../features/auth/AuthProvider";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";
import { LoginPage } from "../features/auth/LoginPage";
import {
  AdminAuditPage,
  AdminResultsPage,
} from "../features/admin/AdminPages";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { AdminUsersPage } from "../features/admin/AdminUsersPage";
import {
  AdminAttemptReportPage,
  AdminStudentModuleReportPage,
  AdminStudentReportPage,
} from "../features/admin/AdminReportPages";
import { AdminPastSimpleAttemptReportPage } from "../features/admin/AdminPastSimplePages";
import { AdminPresentSimpleAttemptReportPage } from "../features/admin/AdminPresentSimplePages";
import { AdminPresentPerfectAttemptReportPage } from "../features/admin/AdminPresentPerfectPages";
import { AdminListeningAttemptReportPage } from "../features/admin/AdminListeningPages";
import { AdminVerbBaseAttemptReportPage } from "../features/admin/AdminVerbBasePages";
import {
  AdminExamsHubPage,
  AdminPastSimpleExamPage,
  AdminPastSimplePracticePage,
  AdminPracticeHubPage,
  AdminPresentPerfectExamPage,
  AdminPresentPerfectPracticePage,
  AdminPresentSimpleExamPage,
  AdminPresentSimplePracticePage,
  AdminListeningPracticePage,
  AdminVerbBaseExamPage,
  AdminVerbExamPage,
} from "../features/admin/AdminModules";
import { ExamInstructionsPage } from "../features/student/ExamInstructionsPage";
import {
  PastSimpleExamPage,
  PastSimpleInstructionsPage,
  PastSimpleResultPage,
  PastSimpleReviewPage,
  PastSimpleStartRedirect,
} from "../features/student/PastSimplePages";
import {
  PresentSimpleExamPage,
  PresentSimpleInstructionsPage,
  PresentSimpleResultPage,
  PresentSimpleReviewPage,
  PresentSimpleStartRedirect,
} from "../features/student/PresentSimplePages";
import {
  PresentPerfectExamPage,
  PresentPerfectInstructionsPage,
  PresentPerfectResultPage,
  PresentPerfectReviewPage,
  PresentPerfectStartRedirect,
} from "../features/student/PresentPerfectPages";
import {
  PastSimplePracticeInstructionsPage,
  PastSimplePracticeResultPage,
  PastSimplePracticeReviewPage,
  PastSimplePracticeSessionPage,
  PastSimplePracticeStartRedirect,
} from "../features/student/PastSimplePracticePages";
import {
  PresentSimplePracticeInstructionsPage,
  PresentSimplePracticeResultPage,
  PresentSimplePracticeReviewPage,
  PresentSimplePracticeSessionPage,
  PresentSimplePracticeStartRedirect,
} from "../features/student/PresentSimplePracticePages";
import {
  PresentPerfectPracticeInstructionsPage,
  PresentPerfectPracticeResultPage,
  PresentPerfectPracticeReviewPage,
  PresentPerfectPracticeSessionPage,
  PresentPerfectPracticeStartRedirect,
} from "../features/student/PresentPerfectPracticePages";
import {
  ListeningPracticeInstructionsPage,
  ListeningPracticeResultPage,
  ListeningPracticeReviewPage,
  ListeningPracticeSessionPage,
  ListeningPracticeStartRedirect,
} from "../features/student/ListeningPracticePages";
import {
  ExamPage,
  ExamResultPage,
  ExamReviewPage,
  ExamStartRedirect,
} from "../features/student/ExamPages";
import {
  VerbBaseExamPage,
  VerbBaseInstructionsPage,
  VerbBaseResultPage,
  VerbBaseReviewPage,
  VerbBaseStartRedirect,
} from "../features/student/VerbBasePages";
import {
  StudentDashboard,
  StudentExamsPage,
  StudentPracticePage,
} from "../features/student/StudentDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={["STUDENT"]} />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/exams" element={<StudentExamsPage />} />
              <Route path="/student/practice" element={<StudentPracticePage />} />
              <Route path="/student/instructions" element={<ExamInstructionsPage />} />
              <Route path="/student/exam/start" element={<ExamStartRedirect />} />
              <Route path="/student/exam/:attemptId" element={<ExamPage />} />
              <Route path="/student/result/:attemptId" element={<ExamResultPage />} />
              <Route
                path="/student/exams/verb_exam/instructions"
                element={<ExamInstructionsPage />}
              />
              <Route
                path="/student/exams/verb_exam/start"
                element={<ExamStartRedirect />}
              />
              <Route
                path="/student/exams/verb_exam/attempts/:attemptId"
                element={<ExamPage />}
              />
              <Route
                path="/student/exams/verb_exam/results/:attemptId"
                element={<ExamResultPage />}
              />
              <Route
                path="/student/exams/verb_exam/results/:attemptId/review"
                element={<ExamReviewPage />}
              />
              <Route
                path="/student/exams/verb_base_exam/instructions"
                element={<VerbBaseInstructionsPage />}
              />
              <Route
                path="/student/exams/verb_base_exam/start"
                element={<VerbBaseStartRedirect />}
              />
              <Route
                path="/student/exams/verb_base_exam/attempts/:attemptId"
                element={<VerbBaseExamPage />}
              />
              <Route
                path="/student/exams/verb_base_exam/results/:attemptId"
                element={<VerbBaseResultPage />}
              />
              <Route
                path="/student/exams/verb_base_exam/results/:attemptId/review"
                element={<VerbBaseReviewPage />}
              />
              <Route
                path="/student/exams/past_simple_exam/instructions"
                element={<PastSimpleInstructionsPage />}
              />
              <Route
                path="/student/exams/past_simple_exam/start"
                element={<PastSimpleStartRedirect />}
              />
              <Route
                path="/student/exams/past_simple_exam/attempts/:attemptId"
                element={<PastSimpleExamPage />}
              />
              <Route
                path="/student/exams/past_simple_exam/results/:attemptId"
                element={<PastSimpleResultPage />}
              />
              <Route
                path="/student/exams/past_simple_exam/results/:attemptId/review"
                element={<PastSimpleReviewPage />}
              />
              <Route
                path="/student/exams/present_simple_exam/instructions"
                element={<PresentSimpleInstructionsPage />}
              />
              <Route
                path="/student/exams/present_simple_exam/start"
                element={<PresentSimpleStartRedirect />}
              />
              <Route
                path="/student/exams/present_simple_exam/attempts/:attemptId"
                element={<PresentSimpleExamPage />}
              />
              <Route
                path="/student/exams/present_simple_exam/results/:attemptId"
                element={<PresentSimpleResultPage />}
              />
              <Route
                path="/student/exams/present_simple_exam/results/:attemptId/review"
                element={<PresentSimpleReviewPage />}
              />
              <Route
                path="/student/exams/present_perfect_exam/instructions"
                element={<PresentPerfectInstructionsPage />}
              />
              <Route
                path="/student/exams/present_perfect_exam/start"
                element={<PresentPerfectStartRedirect />}
              />
              <Route
                path="/student/exams/present_perfect_exam/attempts/:attemptId"
                element={<PresentPerfectExamPage />}
              />
              <Route
                path="/student/exams/present_perfect_exam/results/:attemptId"
                element={<PresentPerfectResultPage />}
              />
              <Route
                path="/student/exams/present_perfect_exam/results/:attemptId/review"
                element={<PresentPerfectReviewPage />}
              />
              <Route
                path="/student/practice/past_simple"
                element={<PastSimplePracticeInstructionsPage />}
              />
              <Route
                path="/student/practice/past_simple/start"
                element={<PastSimplePracticeStartRedirect />}
              />
              <Route
                path="/student/practice/past_simple/sessions/:sessionId"
                element={<PastSimplePracticeSessionPage />}
              />
              <Route
                path="/student/practice/past_simple/results/:sessionId"
                element={<PastSimplePracticeResultPage />}
              />
              <Route
                path="/student/practice/past_simple/results/:sessionId/review"
                element={<PastSimplePracticeReviewPage />}
              />
              <Route
                path="/student/practice/present_simple"
                element={<PresentSimplePracticeInstructionsPage />}
              />
              <Route
                path="/student/practice/present_simple/start"
                element={<PresentSimplePracticeStartRedirect />}
              />
              <Route
                path="/student/practice/present_simple/sessions/:sessionId"
                element={<PresentSimplePracticeSessionPage />}
              />
              <Route
                path="/student/practice/present_simple/results/:sessionId"
                element={<PresentSimplePracticeResultPage />}
              />
              <Route
                path="/student/practice/present_simple/results/:sessionId/review"
                element={<PresentSimplePracticeReviewPage />}
              />
              <Route
                path="/student/practice/present_perfect"
                element={<PresentPerfectPracticeInstructionsPage />}
              />
              <Route
                path="/student/practice/present_perfect/start"
                element={<PresentPerfectPracticeStartRedirect />}
              />
              <Route
                path="/student/practice/present_perfect/sessions/:sessionId"
                element={<PresentPerfectPracticeSessionPage />}
              />
              <Route
                path="/student/practice/present_perfect/results/:sessionId"
                element={<PresentPerfectPracticeResultPage />}
              />
              <Route
                path="/student/practice/present_perfect/results/:sessionId/review"
                element={<PresentPerfectPracticeReviewPage />}
              />
              <Route
                path="/student/practice/listening"
                element={<ListeningPracticeInstructionsPage />}
              />
              <Route
                path="/student/practice/listening/start"
                element={<ListeningPracticeStartRedirect />}
              />
              <Route
                path="/student/practice/listening/sessions/:sessionId"
                element={<ListeningPracticeSessionPage />}
              />
              <Route
                path="/student/practice/listening/results/:sessionId"
                element={<ListeningPracticeResultPage />}
              />
              <Route
                path="/student/practice/listening/results/:sessionId/review"
                element={<ListeningPracticeReviewPage />}
              />
            </Route>

            <Route element={<ProtectedRoute roles={["SUPERADMIN", "ADMIN"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/exams" element={<AdminExamsHubPage />} />
              <Route path="/admin/exams/verb" element={<AdminVerbExamPage />} />
              <Route
                path="/admin/exams/verb-base"
                element={<AdminVerbBaseExamPage />}
              />
              <Route
                path="/admin/exams/past-simple"
                element={<AdminPastSimpleExamPage />}
              />
              <Route
                path="/admin/exams/present-simple"
                element={<AdminPresentSimpleExamPage />}
              />
              <Route
                path="/admin/exams/present-perfect"
                element={<AdminPresentPerfectExamPage />}
              />
              <Route path="/admin/practice" element={<AdminPracticeHubPage />} />
              <Route
                path="/admin/practice/past-simple"
                element={<AdminPastSimplePracticePage />}
              />
              <Route
                path="/admin/practice/present-simple"
                element={<AdminPresentSimplePracticePage />}
              />
              <Route
                path="/admin/practice/present-perfect"
                element={<AdminPresentPerfectPracticePage />}
              />
              <Route
                path="/admin/practice/listening"
                element={<AdminListeningPracticePage />}
              />
              <Route path="/admin/results" element={<AdminResultsPage />} />
              <Route
                path="/admin/students/:userId/report"
                element={<AdminStudentReportPage />}
              />
              <Route
                path="/admin/students/:userId/exams/verb"
                element={<AdminStudentModuleReportPage module="verb" />}
              />
              <Route
                path="/admin/students/:userId/exams/verb-base"
                element={<AdminStudentModuleReportPage module="verb-base" />}
              />
              <Route
                path="/admin/students/:userId/exams/past-simple"
                element={
                  <AdminStudentModuleReportPage module="past-simple-exam" />
                }
              />
              <Route
                path="/admin/students/:userId/exams/present-simple"
                element={
                  <AdminStudentModuleReportPage module="present-simple-exam" />
                }
              />
              <Route
                path="/admin/students/:userId/exams/present-perfect"
                element={
                  <AdminStudentModuleReportPage module="present-perfect-exam" />
                }
              />
              <Route
                path="/admin/students/:userId/practice/past-simple"
                element={
                  <AdminStudentModuleReportPage module="past-simple-practice" />
                }
              />
              <Route
                path="/admin/students/:userId/practice/present-simple"
                element={
                  <AdminStudentModuleReportPage module="present-simple-practice" />
                }
              />
              <Route
                path="/admin/students/:userId/practice/present-perfect"
                element={
                  <AdminStudentModuleReportPage module="present-perfect-practice" />
                }
              />
              <Route
                path="/admin/students/:userId/practice/listening"
                element={
                  <AdminStudentModuleReportPage module="listening-practice" />
                }
              />
              <Route
                path="/admin/exams/verb/reports/:attemptId"
                element={<AdminAttemptReportPage />}
              />
              <Route
                path="/admin/exams/verb-base/reports/:attemptId"
                element={<AdminVerbBaseAttemptReportPage />}
              />
              <Route
                path="/admin/exams/past-simple/reports/:attemptId"
                element={<AdminPastSimpleAttemptReportPage />}
              />
              <Route
                path="/admin/exams/present-simple/reports/:attemptId"
                element={<AdminPresentSimpleAttemptReportPage />}
              />
              <Route
                path="/admin/exams/present-perfect/reports/:attemptId"
                element={<AdminPresentPerfectAttemptReportPage />}
              />
              <Route
                path="/admin/practice/present-perfect/reports/:attemptId"
                element={<AdminPresentPerfectAttemptReportPage />}
              />
              <Route
                path="/admin/practice/present-simple/reports/:attemptId"
                element={<AdminPresentSimpleAttemptReportPage />}
              />
              <Route
                path="/admin/practice/past-simple/reports/:attemptId"
                element={<AdminPastSimpleAttemptReportPage />}
              />
              <Route
                path="/admin/practice/listening/reports/:attemptId"
                element={<AdminListeningAttemptReportPage />}
              />
              {/* Compatibilidad con rutas antiguas */}
              <Route path="/admin/verbs" element={<Navigate to="/admin/exams/verb" replace />} />
              <Route
                path="/admin/config"
                element={<Navigate to="/admin/exams/verb" replace />}
              />
              <Route
                path="/admin/past-simple"
                element={<Navigate to="/admin/exams/past-simple" replace />}
              />
              <Route
                path="/admin/reports/:attemptId"
                element={<AdminAttemptReportPage />}
              />
              <Route
                path="/admin/past-simple/reports/:attemptId"
                element={<AdminPastSimpleAttemptReportPage />}
              />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
