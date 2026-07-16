import type {
  AdminUser,
  Attempt,
  AttemptResult,
  ExamConfig,
  UserMe,
  VerbItem,
} from "./types";
import { apiFetch } from "./api";

export { apiFetch, ApiError } from "./api";

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ user: UserMe; must_change_password: boolean }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => apiFetch<{ status: string }>("/auth/logout", { method: "POST" }),
  me: () => apiFetch<UserMe>("/auth/me"),
  changePassword: (current_password: string, new_password: string) =>
    apiFetch<{ status: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
};

export const examApi = {
  config: () => apiFetch<ExamConfig>("/exam/config"),
  startAttempt: () => apiFetch<Attempt>("/attempts", { method: "POST" }),
  currentAttempt: () => apiFetch<Attempt | null>("/attempts/current"),
  getAttempt: (id: string) => apiFetch<Attempt>(`/attempts/${id}`),
  saveAnswer: (attemptId: string, questionId: string, answers: Record<string, string | null>) =>
    apiFetch<{ status: string }>(`/attempts/${attemptId}/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(answers),
    }),
  submit: (attemptId: string) =>
    apiFetch<Attempt>(`/attempts/${attemptId}/submit`, { method: "POST" }),
  result: (attemptId: string) => apiFetch<AttemptResult>(`/attempts/${attemptId}/result`),
};

export const adminApi = {
  dashboard: () =>
    apiFetch<{
      active_students: number;
      finished_attempts: number;
      average_percentage: number | null;
      passed_count: number;
    }>("/admin/dashboard"),
  listUsers: (params?: { search?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    return apiFetch<{ items: AdminUser[]; total: number }>(`/admin/users?${q}`);
  },
  createUser: (data: { username: string; full_name: string; role: string }) =>
    apiFetch<{ user: AdminUser; temporary_password: string }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resetPassword: (userId: string) =>
    apiFetch<{ temporary_password: string }>(`/admin/users/${userId}/reset-password`, {
      method: "POST",
    }),
  allowNewAttempt: (userId: string) =>
    apiFetch<{ status: string }>(`/admin/users/${userId}/allow-new-attempt`, { method: "POST" }),
  listVerbs: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch<{ items: VerbItem[]; total: number }>(`/admin/verbs${q}`);
  },
  toggleVerb: (verbId: string, is_active: boolean) =>
    apiFetch<{ id: string; is_active: boolean }>(`/admin/verbs/${verbId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    }),
  getExamConfig: () =>
    apiFetch<ExamConfig & { review_policy: string }>("/admin/exam-config"),
  updateExamConfig: (data: Partial<ExamConfig>) =>
    apiFetch<ExamConfig>("/admin/exam-config", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  listAttempts: () => apiFetch<{ items: Record<string, unknown>[] }>("/admin/attempts"),
  auditLogs: () => apiFetch<{ items: Record<string, unknown>[] }>("/admin/audit-logs"),
};
