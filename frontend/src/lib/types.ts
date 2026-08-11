export type UserRole = "SUPERADMIN" | "ADMIN" | "STUDENT";

export function isStaffRole(role: UserRole | undefined | null): boolean {
  return role === "SUPERADMIN" || role === "ADMIN";
}

export function roleLabel(role: UserRole): string {
  if (role === "SUPERADMIN") return "Superadmin";
  if (role === "ADMIN") return "Administrador";
  return "Estudiante";
}
export type ExamType = "verb_exam" | "past_simple_exam";

export interface UserMe {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  must_change_password: boolean;
  is_active: boolean;
  last_login_at: string | null;
}

export interface ExamConfig {
  exam_type?: ExamType;
  is_enabled?: boolean;
  question_count: number;
  passing_percentage: number;
  duration_minutes: number | null;
  max_attempts: number;
  review_policy: string;
}

export interface PastSimpleConfig {
  exam_type: "past_simple_exam";
  title: string;
  is_enabled: boolean;
  practice_enabled?: boolean;
  question_count: number;
  question_bank_size?: number;
  passing_percentage: number;
  duration_minutes: number | null;
  review_policy: string;
}

export interface RequiredField {
  field: string;
  label: string;
}

export interface ExamQuestion {
  id: string;
  position: number;
  prompt_type: string;
  prompt_label: string;
  shown_field: string;
  shown_value: string;
  required_fields: RequiredField[];
  answers: { base: string | null; past: string | null; spanish: string | null };
  grades?: { base: boolean | null; past: boolean | null; spanish: boolean | null };
  expected?: { base: string; past: string; spanish: string };
  fully_correct?: boolean;
}

export interface Attempt {
  id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  questions: ExamQuestion[];
}

export interface AttemptStatus {
  exam_type?: ExamType;
  mode?: "exam" | "practice";
  is_available?: boolean;
  has_open_attempt: boolean;
  open_attempt_id: string | null;
  submitted_count: number;
  max_attempts: number | null;
  can_start_new: boolean;
  question_bank_size?: number;
  last_submitted: {
    id: string;
    percentage: number | null;
    passed: boolean | null;
    submitted_at: string | null;
  } | null;
}

export interface AttemptResult {
  id: string;
  status: string;
  correct_fields: number | null;
  total_fields: number;
  fully_correct_questions: number | null;
  percentage: number | null;
  passed: boolean | null;
  review_policy: string;
  questions?: ExamQuestion[];
}

export interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
  attempts_used?: number | null;
  attempts_max?: number | null;
  attempts_remaining?: number | null;
  has_open_attempt?: boolean | null;
  exam_access?: ExamAccess[];
}

export interface ExamAccess {
  exam_type: ExamType;
  globally_enabled?: boolean;
  is_enabled: boolean;
  practice_enabled?: boolean;
  allowed_attempts: number;
  submitted_attempts?: number;
  remaining_attempts?: number;
  practice_submitted_attempts?: number;
}

export interface VerbItem {
  id: string;
  source_order: number;
  base_display: string;
  past_display: string;
  spanish_display: string;
  spanish_prompt: string;
  is_active: boolean;
}

export interface AdminAttemptListItem {
  id: string;
  exam_type: ExamType;
  exam_name: string;
  student_id: string;
  student_username: string;
  student_name: string;
  status: string;
  percentage: number | null;
  passed: boolean | null;
  started_at: string;
  submitted_at: string | null;
  attempt_number?: number;
  score_out_of_ten?: number | null;
}

export interface AdminAttemptSummary {
  id: string;
  exam_type: ExamType;
  exam_name: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  percentage: number | null;
  passed: boolean | null;
  correct_fields: number | null;
  total_fields: number | null;
  fully_correct_questions: number | null;
}

export interface AdminStudentReport {
  student: AdminUser;
  attempts: AdminAttemptSummary[];
  past_simple_attempts: PastSimpleAttemptSummary[];
  past_simple_practice_attempts?: PastSimpleAttemptSummary[];
  practice_sessions_completed?: number;
}

export interface AdminAttemptReport extends AttemptResult {
  exam_type: "verb_exam";
  exam_name: string;
  student_id: string;
  student_username: string;
  student_name: string;
  started_at: string;
  submitted_at: string | null;
  questions: ExamQuestion[];
}

export interface PastSimpleQuestion {
  id: string;
  position: number;
  topic: string;
  question_type: string;
  instruction: string;
  question: string;
  options: string[] | null;
  answer: string | null;
  correct_answer?: string;
  is_correct?: boolean | null;
  status?: "correct" | "incorrect" | "unanswered";
  explanation?: string;
}

export interface PastSimpleAttempt {
  id: string;
  exam_type: "past_simple_exam";
  mode?: "exam" | "practice";
  exam_name: string;
  attempt_number: number;
  status: string;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  questions: PastSimpleQuestion[];
}

export interface TopicPerformance {
  topic: string;
  topic_label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percentage: number;
}

export interface PastSimpleResult extends PastSimpleAttempt {
  student_id: string;
  student_name: string;
  student_username: string;
  duration_seconds: number | null;
  total_questions: number;
  correct_answers: number | null;
  incorrect_answers: number | null;
  unanswered_answers: number | null;
  percentage: number | null;
  score_out_of_ten: number | null;
  passed: boolean | null;
  review_policy: string;
  topic_performance: TopicPerformance[];
  observation: {
    strong_topics: string[];
    topics_to_review: string[];
  };
}

export interface PastSimpleAttemptSummary {
  id: string;
  exam_type: "past_simple_exam";
  exam_name: string;
  mode?: "exam" | "practice";
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  percentage: number | null;
  score_out_of_ten: number | null;
  passed: boolean | null;
  correct_answers: number | null;
  incorrect_answers: number | null;
  unanswered_answers: number | null;
  total_questions: number;
}

export interface PastSimpleQuestionAdmin {
  id: string;
  stable_key: string;
  topic: string;
  question_type: string;
  instruction: string;
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  points: number;
  active: boolean;
}

export type ResourceType = "pdf" | "link" | "video";

export interface StudyGroupMember {
  user_id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  is_active: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
  members?: StudyGroupMember[];
}

export interface GroupMetrics {
  group_id: string;
  group_name: string;
  member_count: number;
  active_member_count: number;
  verb_finished: number;
  verb_average_percentage: number | null;
  past_simple_finished: number;
  past_simple_average_percentage: number | null;
  alerts: string[];
}

export interface GroupDashboardSummary {
  group_id: string;
  group_name: string;
  member_count: number;
  verb_average_percentage: number | null;
  past_simple_average_percentage: number | null;
  alert_count: number;
}

export interface MonthlyActiveStudents {
  year_month: string;
  count: number;
}

export interface LearningResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  url: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  group_ids: string[];
  group_names: string[];
}

export interface AdminDashboardData {
  active_students: number;
  finished_attempts: number;
  average_percentage: number | null;
  passed_count: number;
  past_simple_finished_attempts: number;
  past_simple_average_percentage: number | null;
  past_simple_passed_count: number;
  monthly_active_students?: MonthlyActiveStudents[];
  monthly_active_students_current?: number;
  groups?: GroupDashboardSummary[];
}
