import type {
  AdminAttemptListItem,
  AdminAttemptReport,
  AdminDashboardData,
  AdminStudentReport,
  AdminUser,
  Attempt,
  AttemptResult,
  AttemptStatus,
  ExamAccess,
  ExamConfig,
  ExamType,
  GroupMetrics,
  LearningResource,
  PastSimpleAttempt,
  PastSimpleConfig,
  PastSimpleQuestion,
  PastSimpleQuestionAdmin,
  PastSimpleResult,
  StudyGroup,
  UserMe,
  VerbItem,
} from "./types";

import { apiFetch, apiFetchBlob, ApiError } from "./api";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "./tokenStorage";

export { apiFetch, ApiError } from "./api";

type LoginResult = {
  user: UserMe;
  must_change_password: boolean;
  access_token: string;
  refresh_token: string;
};

export const authApi = {
  login: async (username: string, password: string) => {
    const result = await apiFetch<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setAuthTokens(result.access_token, result.refresh_token);
    return result;
  },
  logout: async () => {
    const refreshToken = getRefreshToken();
    try {
      await apiFetch<{ status: string }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } finally {
      clearAuthTokens();
    }
  },
  me: async (): Promise<UserMe | null> => {
    if (!getAccessToken() && !getRefreshToken()) {
      return null;
    }
    try {
      return await apiFetch<UserMe>("/auth/me");
    } catch (err) {
      if (err instanceof ApiError && err.code === "UNAUTHORIZED") {
        return null;
      }
      // 401 ya limpia tokens en apiFetch; otras fallas de auth → sin sesión
      if (err instanceof ApiError && !getAccessToken()) {
        return null;
      }
      throw err;
    }
  },
  changePassword: async (current_password: string, new_password: string) => {
    const result = await apiFetch<{
      user: UserMe;
      access_token: string;
      refresh_token: string;
    }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    });
    setAuthTokens(result.access_token, result.refresh_token);
    return result;
  },
};

export const examApi = {
  config: () => apiFetch<ExamConfig>("/exam/config"),
  attemptStatus: () => apiFetch<AttemptStatus>("/attempts/status"),
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

export const pastSimpleApi = {
  config: () =>
    apiFetch<PastSimpleConfig>("/past-simple/config"),
  attemptStatus: () =>
    apiFetch<AttemptStatus>("/past-simple/attempts/status"),
  startAttempt: () =>
    apiFetch<PastSimpleAttempt>("/past-simple/attempts", { method: "POST" }),
  currentAttempt: () =>
    apiFetch<PastSimpleAttempt | null>("/past-simple/attempts/current"),
  getAttempt: (id: string) =>
    apiFetch<PastSimpleAttempt>(`/past-simple/attempts/${id}`),
  saveAnswer: (attemptId: string, questionId: string, answer: string | null) =>
    apiFetch<{ status: string }>(
      `/past-simple/attempts/${attemptId}/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ answer }),
      },
    ),
  submit: (attemptId: string) =>
    apiFetch<PastSimpleAttempt>(`/past-simple/attempts/${attemptId}/submit`, {
      method: "POST",
    }),
  result: (attemptId: string) =>
    apiFetch<PastSimpleResult>(`/past-simple/attempts/${attemptId}/result`),
  practiceStatus: () =>
    apiFetch<AttemptStatus>("/past-simple/practice/status"),
  startPractice: () =>
    apiFetch<PastSimpleAttempt>("/past-simple/practice/sessions", {
      method: "POST",
    }),
  getPractice: (id: string) =>
    apiFetch<PastSimpleAttempt>(`/past-simple/practice/sessions/${id}`),
  checkPracticeAnswer: (
    attemptId: string,
    questionId: string,
    answer: string | null,
  ) =>
    apiFetch<PastSimpleQuestion>(
      `/past-simple/practice/sessions/${attemptId}/questions/${questionId}/check`,
      {
        method: "POST",
        body: JSON.stringify({ answer }),
      },
    ),
  submitPractice: (attemptId: string) =>
    apiFetch<PastSimpleResult>(
      `/past-simple/practice/sessions/${attemptId}/submit`,
      { method: "POST" },
    ),
  practiceResult: (attemptId: string) =>
    apiFetch<PastSimpleResult>(
      `/past-simple/practice/sessions/${attemptId}/result`,
    ),
};

export const adminApi = {
  dashboard: () => apiFetch<AdminDashboardData>("/admin/dashboard"),
  listGroups: () => apiFetch<{ items: StudyGroup[] }>("/admin/groups"),
  getGroup: (groupId: string) => apiFetch<StudyGroup>(`/admin/groups/${groupId}`),
  createGroup: (data: {
    name: string;
    description?: string;
    teacher_id?: string | null;
    is_active?: boolean;
  }) =>
    apiFetch<StudyGroup>("/admin/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateGroup: (
    groupId: string,
    data: {
      name?: string;
      description?: string | null;
      teacher_id?: string | null;
      is_active?: boolean;
    },
  ) =>
    apiFetch<StudyGroup>(`/admin/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteGroup: (groupId: string) =>
    apiFetch<{ status: string }>(`/admin/groups/${groupId}`, { method: "DELETE" }),
  addGroupMember: (groupId: string, userId: string) =>
    apiFetch<StudyGroup>(`/admin/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
  removeGroupMember: (groupId: string, userId: string) =>
    apiFetch<StudyGroup>(`/admin/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    }),
  groupMetrics: (groupId: string) =>
    apiFetch<GroupMetrics>(`/admin/groups/${groupId}/metrics`),
  listResources: () => apiFetch<{ items: LearningResource[] }>("/admin/resources"),
  createResource: (data: {
    title: string;
    description?: string;
    resource_type: string;
    url: string;
    is_active?: boolean;
    group_ids?: string[];
  }) =>
    apiFetch<LearningResource>("/admin/resources", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateResource: (
    resourceId: string,
    data: {
      title?: string;
      description?: string | null;
      resource_type?: string;
      url?: string;
      is_active?: boolean;
      group_ids?: string[];
    },
  ) =>
    apiFetch<LearningResource>(`/admin/resources/${resourceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteResource: (resourceId: string) =>
    apiFetch<{ status: string }>(`/admin/resources/${resourceId}`, {
      method: "DELETE",
    }),
  listUsers: (params?: { search?: string; page?: number; role?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.role) q.set("role", params.role);
    return apiFetch<{ items: AdminUser[]; total: number }>(`/admin/users?${q}`);
  },
  createUser: (data: {
    username: string;
    full_name: string;
    role: string;
    password?: string;
  }) =>
    apiFetch<{ user: AdminUser; temporary_password: string }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateUser: (
    userId: string,
    data: {
      username?: string;
      full_name?: string;
      password?: string;
      is_active?: boolean;
    },
  ) =>
    apiFetch<AdminUser>(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteUser: (userId: string) =>
    apiFetch<{ status: string; id: string; username: string; role: string }>(
      `/admin/users/${userId}`,
      { method: "DELETE" },
    ),
  resetPassword: (userId: string, password?: string) =>
    apiFetch<{ temporary_password: string }>(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify(password ? { password } : {}),
    }),
  allowNewAttempt: (userId: string) =>
    apiFetch<{ status: string }>(`/admin/users/${userId}/allow-new-attempt`, { method: "POST" }),
  examAccess: (userId: string) =>
    apiFetch<{ items: ExamAccess[] }>(`/admin/users/${userId}/exam-access`),
  updateExamAccess: (
    userId: string,
    examType: ExamType,
    data: { is_enabled?: boolean; practice_enabled?: boolean },
  ) =>
    apiFetch<ExamAccess>(`/admin/users/${userId}/exam-access/${examType}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  authorizeNewAttempt: (
    userId: string,
    examType: ExamType,
    mode: "exam" | "practice" = "exam",
  ) =>
    apiFetch<{
      status: string;
      exam_type: ExamType;
      mode: "exam" | "practice";
      allowed_attempts: number;
      submitted_attempts: number;
      remaining_attempts: number;
    }>(
      `/admin/users/${userId}/exams/${examType}/allow-new-attempt?mode=${mode}`,
      { method: "POST" },
    ),
  resetExamProgress: (
    userId: string,
    examType: ExamType,
    mode: "exam" | "practice" = "exam",
  ) =>
    apiFetch<{
      status: string;
      exam_type: ExamType;
      mode: "exam" | "practice";
      deleted_attempts: number;
      allowed_attempts: number;
    }>(
      `/admin/users/${userId}/exams/${examType}/reset?mode=${mode}`,
      { method: "POST" },
    ),
  /** @deprecated Use resetExamProgress */
  resetPastSimpleProgress: (userId: string, mode: "exam" | "practice") =>
    apiFetch<{
      status: string;
      exam_type: ExamType;
      mode: "exam" | "practice";
      deleted_attempts: number;
      allowed_attempts: number;
    }>(
      `/admin/users/${userId}/exams/past_simple_exam/reset?mode=${mode}`,
      { method: "POST" },
    ),
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
  listAttempts: () =>
    apiFetch<{ items: AdminAttemptListItem[] }>("/admin/attempts"),
  studentReport: (userId: string) =>
    apiFetch<AdminStudentReport>(`/admin/users/${userId}/report`),
  attemptReport: (attemptId: string) =>
    apiFetch<AdminAttemptReport>(`/admin/attempts/${attemptId}`),
  getPastSimpleConfig: () =>
    apiFetch<PastSimpleConfig>("/admin/past-simple/config"),
  updatePastSimpleConfig: (
    data: Partial<
      Pick<
        PastSimpleConfig,
        | "is_enabled"
        | "practice_enabled"
        | "passing_percentage"
        | "duration_minutes"
        | "review_policy"
      >
    >,
  ) =>
    apiFetch<PastSimpleConfig>("/admin/past-simple/config", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  listPastSimpleQuestions: () =>
    apiFetch<{ items: PastSimpleQuestionAdmin[] }>("/admin/past-simple/questions"),
  togglePastSimpleQuestion: (questionId: string, active: boolean) =>
    apiFetch<{ id: string; active: boolean }>(
      `/admin/past-simple/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ active }),
      },
    ),
  listPastSimpleAttempts: (mode: "exam" | "practice" = "exam") =>
    apiFetch<{ items: AdminAttemptListItem[]; total: number }>(
      `/admin/past-simple/attempts?mode=${mode}`,
    ),
  pastSimpleAttemptReport: (attemptId: string) =>
    apiFetch<PastSimpleResult>(`/admin/past-simple/attempts/${attemptId}`),
  downloadAttemptsCsv: async () => {
    const url = URL.createObjectURL(
      await apiFetchBlob("/admin/attempts/export.csv"),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "resultados-examenes.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  },
  auditLogs: () => apiFetch<{ items: Record<string, unknown>[] }>("/admin/audit-logs"),
};

export const studentApi = {
  listResources: () =>
    apiFetch<{ items: LearningResource[] }>("/student/resources"),
};
