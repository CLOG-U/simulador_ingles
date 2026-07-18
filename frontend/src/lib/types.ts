export type UserRole = "ADMIN" | "STUDENT";

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
  question_count: number;
  passing_percentage: number;
  duration_minutes: number | null;
  max_attempts: number;
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
  has_open_attempt: boolean;
  open_attempt_id: string | null;
  submitted_count: number;
  max_attempts: number;
  can_start_new: boolean;
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
  student_id: string;
  student_username: string;
  student_name: string;
  status: string;
  percentage: number | null;
  passed: boolean | null;
  started_at: string;
  submitted_at: string | null;
}

export interface AdminAttemptSummary {
  id: string;
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
}

export interface AdminAttemptReport extends AttemptResult {
  student_id: string;
  student_username: string;
  student_name: string;
  started_at: string;
  submitted_at: string | null;
  questions: ExamQuestion[];
}
