import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RequireAuth } from "../components/RequireAuth";
import { AuthProvider } from "../features/auth/AuthProvider";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";
import { LoginPage } from "../features/auth/LoginPage";
import {
  AdminAuditPage,
  AdminConfigPage,
  AdminResultsPage,
  AdminVerbsPage,
} from "../features/admin/AdminPages";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { AdminUsersPage } from "../features/admin/AdminUsersPage";
import {
  AdminAttemptReportPage,
  AdminStudentReportPage,
} from "../features/admin/AdminReportPages";
import {
  AdminPastSimpleAttemptReportPage,
  AdminPastSimplePage,
} from "../features/admin/AdminPastSimplePages";
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
import { StudentDashboard } from "../features/student/StudentDashboard";

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

            <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/verbs" element={<AdminVerbsPage />} />
              <Route path="/admin/past-simple" element={<AdminPastSimplePage />} />
              <Route path="/admin/config" element={<AdminConfigPage />} />
              <Route path="/admin/results" element={<AdminResultsPage />} />
              <Route path="/admin/students/:userId/report" element={<AdminStudentReportPage />} />
              <Route path="/admin/reports/:attemptId" element={<AdminAttemptReportPage />} />
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
