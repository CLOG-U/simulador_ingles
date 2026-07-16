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
import { ExamInstructionsPage } from "../features/student/ExamInstructionsPage";
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
            </Route>

            <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/verbs" element={<AdminVerbsPage />} />
              <Route path="/admin/config" element={<AdminConfigPage />} />
              <Route path="/admin/results" element={<AdminResultsPage />} />
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
