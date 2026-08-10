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
import {
  AdminExamsHubPage,
  AdminPastSimpleExamPage,
  AdminPastSimplePracticePage,
  AdminPracticeHubPage,
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
  PastSimplePracticeInstructionsPage,
  PastSimplePracticeResultPage,
  PastSimplePracticeReviewPage,
  PastSimplePracticeSessionPage,
  PastSimplePracticeStartRedirect,
} from "../features/student/PastSimplePracticePages";
import {
  ExamPage,
  ExamResultPage,
  ExamStartRedirect,
} from "../features/student/ExamPages";
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
            </Route>

            <Route element={<ProtectedRoute roles={["SUPERADMIN", "ADMIN"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/exams" element={<AdminExamsHubPage />} />
              <Route path="/admin/exams/verb" element={<AdminVerbExamPage />} />
              <Route
                path="/admin/exams/past-simple"
                element={<AdminPastSimpleExamPage />}
              />
              <Route path="/admin/practice" element={<AdminPracticeHubPage />} />
              <Route
                path="/admin/practice/past-simple"
                element={<AdminPastSimplePracticePage />}
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
                path="/admin/students/:userId/exams/past-simple"
                element={
                  <AdminStudentModuleReportPage module="past-simple-exam" />
                }
              />
              <Route
                path="/admin/students/:userId/practice/past-simple"
                element={
                  <AdminStudentModuleReportPage module="past-simple-practice" />
                }
              />
              <Route
                path="/admin/exams/verb/reports/:attemptId"
                element={<AdminAttemptReportPage />}
              />
              <Route
                path="/admin/exams/past-simple/reports/:attemptId"
                element={<AdminPastSimpleAttemptReportPage />}
              />
              <Route
                path="/admin/practice/past-simple/reports/:attemptId"
                element={<AdminPastSimpleAttemptReportPage />}
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
