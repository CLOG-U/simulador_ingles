import type {
  AdminAttemptListItem,
  AdminAttemptReport,
  AdminStudentReport,
  AdminUser,
  Attempt,
  AttemptResult,
  AttemptStatus,
  ExamAccess,
  ExamConfig,
  ExamQuestion,
  ExamType,
  PastSimpleAttempt,
  PastSimpleConfig,
  PastSimpleQuestion,
  PastSimpleQuestionAdmin,
  PastSimpleResult,
  PresentSimpleConfig,
  PresentSimpleQuestionAdmin,
  PresentSimpleResult,
  PresentPerfectConfig,
  PresentPerfectQuestionAdmin,
  PresentPerfectResult,
  ListeningConfig,
  ListeningClip,
  ListeningQuestion,
  ListeningQuestionAdmin,
  ListeningResult,
  UserMe,
  VerbBaseResult,
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
  restartPractice: () =>
    apiFetch<PastSimpleAttempt>("/past-simple/practice/sessions/restart", {
      method: "POST",
    }),
  abandonPractice: () =>
    apiFetch<{ abandoned: boolean; abandoned_count: number }>(
      "/past-simple/practice/sessions/abandon",
      { method: "POST" },
    ),
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

export const verbBaseApi = {
  config: () => apiFetch<ExamConfig>("/verb-base/config"),
  attemptStatus: () => apiFetch<AttemptStatus>("/verb-base/attempts/status"),
  startAttempt: () =>
    apiFetch<Attempt>("/verb-base/attempts", { method: "POST" }),
  currentAttempt: () =>
    apiFetch<Attempt | null>("/verb-base/attempts/current"),
  getAttempt: (id: string) => apiFetch<Attempt>(`/verb-base/attempts/${id}`),
  saveAnswer: (attemptId: string, questionId: string, answer: string | null) =>
    apiFetch<{ status: string }>(
      `/verb-base/attempts/${attemptId}/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ answer }),
      },
    ),
  submit: (attemptId: string) =>
    apiFetch<Attempt>(`/verb-base/attempts/${attemptId}/submit`, {
      method: "POST",
    }),
  result: (attemptId: string) =>
    apiFetch<VerbBaseResult>(`/verb-base/attempts/${attemptId}/result`),
  practiceStatus: () => apiFetch<AttemptStatus>("/verb-base/practice/status"),
  startPractice: () =>
    apiFetch<Attempt>("/verb-base/practice/sessions", { method: "POST" }),
  restartPractice: () =>
    apiFetch<Attempt>("/verb-base/practice/sessions/restart", {
      method: "POST",
    }),
  abandonPractice: () =>
    apiFetch<{ abandoned: boolean; abandoned_count: number }>(
      "/verb-base/practice/sessions/abandon",
      { method: "POST" },
    ),
  getPractice: (id: string) =>
    apiFetch<Attempt>(`/verb-base/practice/sessions/${id}`),
  checkPracticeAnswer: (
    attemptId: string,
    questionId: string,
    answer: string | null,
  ) =>
    apiFetch<ExamQuestion>(
      `/verb-base/practice/sessions/${attemptId}/questions/${questionId}/check`,
      {
        method: "POST",
        body: JSON.stringify({ answer }),
      },
    ),
  submitPractice: (attemptId: string) =>
    apiFetch<VerbBaseResult>(
      `/verb-base/practice/sessions/${attemptId}/submit`,
      { method: "POST" },
    ),
  practiceResult: (attemptId: string) =>
    apiFetch<VerbBaseResult>(
      `/verb-base/practice/sessions/${attemptId}/result`,
    ),
};

export const presentSimpleApi = {
  config: () =>
    apiFetch<PresentSimpleConfig>("/present-simple/config"),
  attemptStatus: () =>
    apiFetch<AttemptStatus>("/present-simple/attempts/status"),
  startAttempt: () =>
    apiFetch<PastSimpleAttempt>("/present-simple/attempts", { method: "POST" }),
  currentAttempt: () =>
    apiFetch<PastSimpleAttempt | null>("/present-simple/attempts/current"),
  getAttempt: (id: string) =>
    apiFetch<PastSimpleAttempt>(`/present-simple/attempts/${id}`),
  saveAnswer: (attemptId: string, questionId: string, answer: string | null) =>
    apiFetch<{ status: string }>(
      `/present-simple/attempts/${attemptId}/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ answer }),
      },
    ),
  submit: (attemptId: string) =>
    apiFetch<PastSimpleAttempt>(`/present-simple/attempts/${attemptId}/submit`, {
      method: "POST",
    }),
  result: (attemptId: string) =>
    apiFetch<PresentSimpleResult>(
      `/present-simple/attempts/${attemptId}/result`,
    ),
  practiceStatus: () =>
    apiFetch<AttemptStatus>("/present-simple/practice/status"),
  startPractice: () =>
    apiFetch<PastSimpleAttempt>("/present-simple/practice/sessions", {
      method: "POST",
    }),
  restartPractice: () =>
    apiFetch<PastSimpleAttempt>("/present-simple/practice/sessions/restart", {
      method: "POST",
    }),
  abandonPractice: () =>
    apiFetch<{ abandoned: boolean; abandoned_count: number }>(
      "/present-simple/practice/sessions/abandon",
      { method: "POST" },
    ),
  getPractice: (id: string) =>
    apiFetch<PastSimpleAttempt>(`/present-simple/practice/sessions/${id}`),
  checkPracticeAnswer: (
    attemptId: string,
    questionId: string,
    answer: string | null,
  ) =>
    apiFetch<PastSimpleQuestion>(
      `/present-simple/practice/sessions/${attemptId}/questions/${questionId}/check`,
      {
        method: "POST",
        body: JSON.stringify({ answer }),
      },
    ),
  submitPractice: (attemptId: string) =>
    apiFetch<PresentSimpleResult>(
      `/present-simple/practice/sessions/${attemptId}/submit`,
      { method: "POST" },
    ),
  practiceResult: (attemptId: string) =>
    apiFetch<PresentSimpleResult>(
      `/present-simple/practice/sessions/${attemptId}/result`,
    ),
};

export const presentPerfectApi = {
  config: () =>
    apiFetch<PresentPerfectConfig>("/present-perfect/config"),
  attemptStatus: () =>
    apiFetch<AttemptStatus>("/present-perfect/attempts/status"),
  startAttempt: () =>
    apiFetch<PastSimpleAttempt>("/present-perfect/attempts", { method: "POST" }),
  currentAttempt: () =>
    apiFetch<PastSimpleAttempt | null>("/present-perfect/attempts/current"),
  getAttempt: (id: string) =>
    apiFetch<PastSimpleAttempt>(`/present-perfect/attempts/${id}`),
  saveAnswer: (attemptId: string, questionId: string, answer: string | null) =>
    apiFetch<{ status: string }>(
      `/present-perfect/attempts/${attemptId}/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ answer }),
      },
    ),
  submit: (attemptId: string) =>
    apiFetch<PastSimpleAttempt>(`/present-perfect/attempts/${attemptId}/submit`, {
      method: "POST",
    }),
  result: (attemptId: string) =>
    apiFetch<PresentPerfectResult>(
      `/present-perfect/attempts/${attemptId}/result`,
    ),
  practiceStatus: () =>
    apiFetch<AttemptStatus>("/present-perfect/practice/status"),
  startPractice: () =>
    apiFetch<PastSimpleAttempt>("/present-perfect/practice/sessions", {
      method: "POST",
    }),
  restartPractice: () =>
    apiFetch<PastSimpleAttempt>("/present-perfect/practice/sessions/restart", {
      method: "POST",
    }),
  abandonPractice: () =>
    apiFetch<{ abandoned: boolean; abandoned_count: number }>(
      "/present-perfect/practice/sessions/abandon",
      { method: "POST" },
    ),
  getPractice: (id: string) =>
    apiFetch<PastSimpleAttempt>(`/present-perfect/practice/sessions/${id}`),
  checkPracticeAnswer: (
    attemptId: string,
    questionId: string,
    answer: string | null,
  ) =>
    apiFetch<PastSimpleQuestion>(
      `/present-perfect/practice/sessions/${attemptId}/questions/${questionId}/check`,
      {
        method: "POST",
        body: JSON.stringify({ answer }),
      },
    ),
  submitPractice: (attemptId: string) =>
    apiFetch<PresentPerfectResult>(
      `/present-perfect/practice/sessions/${attemptId}/submit`,
      { method: "POST" },
    ),
  practiceResult: (attemptId: string) =>
    apiFetch<PresentPerfectResult>(
      `/present-perfect/practice/sessions/${attemptId}/result`,
    ),
};

export const listeningApi = {
  config: () => apiFetch<ListeningConfig>("/listening/config"),
  attemptStatus: () => apiFetch<AttemptStatus>("/listening/attempts/status"),
  startAttempt: () =>
    apiFetch<PastSimpleAttempt>("/listening/attempts", { method: "POST" }),
  getAttempt: (id: string) =>
    apiFetch<PastSimpleAttempt>(`/listening/attempts/${id}`),
  saveAnswer: (attemptId: string, questionId: string, answer: string | null) =>
    apiFetch<{ status: string }>(
      `/listening/attempts/${attemptId}/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ answer }),
      },
    ),
  submit: (attemptId: string) =>
    apiFetch<PastSimpleAttempt>(`/listening/attempts/${attemptId}/submit`, {
      method: "POST",
    }),
  result: (attemptId: string) =>
    apiFetch<ListeningResult>(`/listening/attempts/${attemptId}/result`),
  practiceStatus: () =>
    apiFetch<AttemptStatus>("/listening/practice/status"),
  listClips: () =>
    apiFetch<{ is_available: boolean; items: ListeningClip[] }>(
      "/listening/practice/clips",
    ),
  startPractice: (clipKey: string) =>
    apiFetch<PastSimpleAttempt>(
      `/listening/practice/sessions?clip_key=${encodeURIComponent(clipKey)}`,
      { method: "POST" },
    ),
  restartPractice: (clipKey: string) =>
    apiFetch<PastSimpleAttempt>(
      `/listening/practice/sessions/restart?clip_key=${encodeURIComponent(clipKey)}`,
      { method: "POST" },
    ),
  abandonPractice: (clipKey?: string) =>
    apiFetch<{ abandoned: boolean; abandoned_count: number }>(
      clipKey
        ? `/listening/practice/sessions/abandon?clip_key=${encodeURIComponent(clipKey)}`
        : "/listening/practice/sessions/abandon",
      { method: "POST" },
    ),
  getPractice: (id: string) =>
    apiFetch<PastSimpleAttempt>(`/listening/practice/sessions/${id}`),
  checkPracticeAnswer: (
    attemptId: string,
    questionId: string,
    answer: string | null,
  ) =>
    apiFetch<ListeningQuestion>(
      `/listening/practice/sessions/${attemptId}/questions/${questionId}/check`,
      {
        method: "POST",
        body: JSON.stringify({ answer }),
      },
    ),
  submitPractice: (attemptId: string) =>
    apiFetch<ListeningResult>(
      `/listening/practice/sessions/${attemptId}/submit`,
      { method: "POST" },
    ),
  practiceResult: (attemptId: string) =>
    apiFetch<ListeningResult>(
      `/listening/practice/sessions/${attemptId}/result`,
    ),
};

export const adminApi = {
  dashboard: () =>
    apiFetch<{
      active_students: number;
      finished_attempts: number;
      average_percentage: number | null;
      passed_count: number;
      past_simple_finished_attempts: number;
      past_simple_average_percentage: number | null;
      past_simple_passed_count: number;
    }>("/admin/dashboard"),
  listUsers: (params?: {
    search?: string;
    page?: number;
    page_size?: number;
    role?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
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
  overrideVerbExamGrade: (
    attemptId: string,
    questionId: string,
    data: { field: string; correct: boolean },
  ) =>
    apiFetch<AdminAttemptReport>(
      `/admin/attempts/${attemptId}/questions/${questionId}/grade`,
      { method: "PATCH", body: JSON.stringify(data) },
    ),
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
  overridePastSimpleGrade: (
    attemptId: string,
    questionId: string,
    correct: boolean,
  ) =>
    apiFetch<PastSimpleResult>(
      `/admin/past-simple/attempts/${attemptId}/questions/${questionId}/grade`,
      { method: "PATCH", body: JSON.stringify({ correct }) },
    ),
  getVerbBaseConfig: () =>
    apiFetch<ExamConfig & { title?: string; review_policy: string }>(
      "/admin/verb-base/config",
    ),
  updateVerbBaseConfig: (
    data: Partial<
      Pick<
        ExamConfig,
        | "is_enabled"
        | "practice_enabled"
        | "passing_percentage"
        | "duration_minutes"
      >
    > & { review_policy?: string },
  ) =>
    apiFetch<ExamConfig>("/admin/verb-base/config", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  listVerbBaseAttempts: (mode: "exam" | "practice" = "exam") =>
    apiFetch<{ items: AdminAttemptListItem[]; total: number }>(
      `/admin/verb-base/attempts?mode=${mode}`,
    ),
  verbBaseAttemptReport: (attemptId: string) =>
    apiFetch<VerbBaseResult>(`/admin/verb-base/attempts/${attemptId}`),
  overrideVerbBaseGrade: (
    attemptId: string,
    questionId: string,
    correct: boolean,
  ) =>
    apiFetch<VerbBaseResult>(
      `/admin/verb-base/attempts/${attemptId}/questions/${questionId}/grade`,
      { method: "PATCH", body: JSON.stringify({ correct }) },
    ),
  getPresentSimpleConfig: () =>
    apiFetch<PresentSimpleConfig>("/admin/present-simple/config"),
  updatePresentSimpleConfig: (
    data: Partial<
      Pick<
        PresentSimpleConfig,
        | "is_enabled"
        | "practice_enabled"
        | "passing_percentage"
        | "duration_minutes"
        | "review_policy"
      >
    >,
  ) =>
    apiFetch<PresentSimpleConfig>("/admin/present-simple/config", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  listPresentSimpleQuestions: () =>
    apiFetch<{ items: PresentSimpleQuestionAdmin[] }>(
      "/admin/present-simple/questions",
    ),
  togglePresentSimpleQuestion: (questionId: string, active: boolean) =>
    apiFetch<{ id: string; active: boolean }>(
      `/admin/present-simple/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ active }),
      },
    ),
  listPresentSimpleAttempts: (mode: "exam" | "practice" = "exam") =>
    apiFetch<{ items: AdminAttemptListItem[]; total: number }>(
      `/admin/present-simple/attempts?mode=${mode}`,
    ),
  presentSimpleAttemptReport: (attemptId: string) =>
    apiFetch<PresentSimpleResult>(
      `/admin/present-simple/attempts/${attemptId}`,
    ),
  overridePresentSimpleGrade: (
    attemptId: string,
    questionId: string,
    correct: boolean,
  ) =>
    apiFetch<PresentSimpleResult>(
      `/admin/present-simple/attempts/${attemptId}/questions/${questionId}/grade`,
      { method: "PATCH", body: JSON.stringify({ correct }) },
    ),
  getPresentPerfectConfig: () =>
    apiFetch<PresentPerfectConfig>("/admin/present-perfect/config"),
  updatePresentPerfectConfig: (
    data: Partial<
      Pick<
        PresentPerfectConfig,
        | "is_enabled"
        | "practice_enabled"
        | "passing_percentage"
        | "duration_minutes"
        | "review_policy"
      >
    >,
  ) =>
    apiFetch<PresentPerfectConfig>("/admin/present-perfect/config", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  listPresentPerfectQuestions: () =>
    apiFetch<{ items: PresentPerfectQuestionAdmin[] }>(
      "/admin/present-perfect/questions",
    ),
  togglePresentPerfectQuestion: (questionId: string, active: boolean) =>
    apiFetch<{ id: string; active: boolean }>(
      `/admin/present-perfect/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ active }),
      },
    ),
  listPresentPerfectAttempts: (mode: "exam" | "practice" = "exam") =>
    apiFetch<{ items: AdminAttemptListItem[]; total: number }>(
      `/admin/present-perfect/attempts?mode=${mode}`,
    ),
  presentPerfectAttemptReport: (attemptId: string) =>
    apiFetch<PresentPerfectResult>(
      `/admin/present-perfect/attempts/${attemptId}`,
    ),
  overridePresentPerfectGrade: (
    attemptId: string,
    questionId: string,
    correct: boolean,
  ) =>
    apiFetch<PresentPerfectResult>(
      `/admin/present-perfect/attempts/${attemptId}/questions/${questionId}/grade`,
      { method: "PATCH", body: JSON.stringify({ correct }) },
    ),
  getListeningConfig: () =>
    apiFetch<ListeningConfig>("/admin/listening/config"),
  updateListeningConfig: (
    data: Partial<
      Pick<
        ListeningConfig,
        | "is_enabled"
        | "practice_enabled"
        | "passing_percentage"
        | "duration_minutes"
        | "review_policy"
      >
    >,
  ) =>
    apiFetch<ListeningConfig>("/admin/listening/config", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  listListeningQuestions: (scope?: "exam" | "practice") =>
    apiFetch<{ items: ListeningQuestionAdmin[] }>(
      scope
        ? `/admin/listening/questions?scope=${scope}`
        : "/admin/listening/questions",
    ),
  toggleListeningQuestion: (questionId: string, active: boolean) =>
    apiFetch<{ id: string; active: boolean }>(
      `/admin/listening/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ active }),
      },
    ),
  listListeningAttempts: (mode: "exam" | "practice" = "practice") =>
    apiFetch<{ items: AdminAttemptListItem[]; total: number }>(
      `/admin/listening/attempts?mode=${mode}`,
    ),
  listeningAttemptReport: (attemptId: string) =>
    apiFetch<ListeningResult>(`/admin/listening/attempts/${attemptId}`),
  overrideListeningGrade: (
    attemptId: string,
    questionId: string,
    correct: boolean,
  ) =>
    apiFetch<ListeningResult>(
      `/admin/listening/attempts/${attemptId}/questions/${questionId}/grade`,
      { method: "PATCH", body: JSON.stringify({ correct }) },
    ),
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
