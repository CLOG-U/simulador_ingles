export type UserRole = "SUPERADMIN" | "ADMIN" | "STUDENT";

export function isStaffRole(role: UserRole | undefined | null): boolean {
  return role === "SUPERADMIN" || role === "ADMIN";
}

export function roleLabel(role: UserRole): string {
  if (role === "SUPERADMIN") return "Superadmin";
  if (role === "ADMIN") return "Administrador";
  return "Estudiante";
}
export type ExamType =
  | "verb_exam"
  | "verb_base_exam"
  | "past_simple_exam"
  | "present_simple_exam"
  | "present_perfect_exam"
  | "listening_practice";

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
  title?: string;
  is_enabled?: boolean;
  practice_enabled?: boolean;
  question_count: number;
  question_bank_size?: number;
  passing_percentage: number;
  duration_minutes: number | null;
  max_attempts?: number;
  review_policy: string;
}

export interface PastSimpleConfig {
  exam_type: "past_simple_exam" | "present_simple_exam"
  | "present_perfect_exam" | "listening_practice";
  title: string;
  is_enabled: boolean;
  practice_enabled?: boolean;
  question_count: number;
  question_bank_size?: number;
  exam_question_bank_size?: number;
  exam_clip_title?: string | null;
  clip_count?: number;
  passing_percentage: number;
  duration_minutes: number | null;
  review_policy: string;
}

export type PresentSimpleConfig = PastSimpleConfig;
export type PresentPerfectConfig = PastSimpleConfig;
export type ListeningConfig = PastSimpleConfig;

export interface ListeningClip {
  clip_key: string;
  title: string;
  description: string;
  audio_url: string | null;
  question_count: number;
  submitted_count: number;
  has_open_attempt: boolean;
  open_attempt_id: string | null;
  can_start: boolean;
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
  answers: {
    base: string | null;
    past?: string | null;
    spanish?: string | null;
  };
  grades?: {
    base: boolean | null;
    past?: boolean | null;
    spanish?: boolean | null;
  };
  expected?: { base: string; past?: string; spanish?: string };
  fully_correct?: boolean;
  is_correct?: boolean | null;
  status?: "correct" | "incorrect" | "unanswered";
  correct_answer?: string;
}

export interface Attempt {
  id: string;
  exam_type?: ExamType;
  mode?: "exam" | "practice";
  exam_name?: string;
  attempt_number?: number;
  status: string;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  questions: ExamQuestion[];
}

export interface VerbBaseResult extends Attempt {
  exam_type: "verb_base_exam";
  correct_answers: number | null;
  incorrect_answers: number | null;
  unanswered_answers: number | null;
  total_questions: number;
  percentage: number | null;
  score_out_of_ten?: number | null;
  duration_seconds?: number | null;
  passed: boolean | null;
  review_policy: string;
  student_id?: string;
  student_username?: string;
  student_name?: string;
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
  exam_type?: ExamType | "verb_exam";
  exam_name?: string;
  student_id?: string;
  student_name?: string;
  student_username?: string;
  attempt_number?: number;
  started_at?: string;
  submitted_at?: string | null;
  duration_seconds?: number | null;
  correct_fields: number | null;
  total_fields: number;
  fully_correct_questions: number | null;
  correct_answers?: number | null;
  incorrect_answers?: number | null;
  unanswered_answers?: number | null;
  total_questions?: number;
  percentage: number | null;
  score_out_of_ten?: number | null;
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
  verb_base_attempts?: AdminAttemptSummary[];
  verb_base_practice_attempts?: AdminAttemptSummary[];
  present_simple_attempts?: PastSimpleAttemptSummary[];
  present_simple_practice_attempts?: PastSimpleAttemptSummary[];
  present_perfect_attempts?: PastSimpleAttemptSummary[];
  present_perfect_practice_attempts?: PastSimpleAttemptSummary[];
  listening_practice_attempts?: PastSimpleAttemptSummary[];
  listening_exam_attempts?: PastSimpleAttemptSummary[];
  practice_sessions_completed?: number;
}

export interface AdminAttemptReport extends AttemptResult {
  exam_type: "verb_exam" | "verb_base_exam";
  exam_name: string;
  student_id: string;
  student_username: string;
  student_name: string;
  started_at: string;
  submitted_at: string | null;
  questions: ExamQuestion[];
  correct_answers?: number | null;
  incorrect_answers?: number | null;
  unanswered_answers?: number | null;
  total_questions?: number;
  score_out_of_ten?: number | null;
  duration_seconds?: number | null;
  attempt_number?: number;
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
  audio_url?: string | null;
  clip_title?: string | null;
}

export interface PastSimpleAttempt {
  id: string;
  exam_type: "past_simple_exam" | "present_simple_exam"
  | "present_perfect_exam" | "listening_practice";
  mode?: "exam" | "practice";
  exam_name: string;
  clip_key?: string | null;
  clip_title?: string | null;
  attempt_number: number;
  status: string;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  questions: PastSimpleQuestion[];
}

export type PresentSimpleAttempt = PastSimpleAttempt;
export type PresentSimpleQuestion = PastSimpleQuestion;
export type PresentSimpleResult = PastSimpleResult;
export type PresentSimpleQuestionAdmin = PastSimpleQuestionAdmin;
export type PresentPerfectResult = PastSimpleResult;
export type PresentPerfectAttempt = PastSimpleAttempt;
export type PresentPerfectQuestion = PastSimpleQuestion;
export type PresentPerfectQuestionAdmin = PastSimpleQuestionAdmin;
export type ListeningResult = PastSimpleResult;
export type ListeningAttempt = PastSimpleAttempt;
export type ListeningQuestion = PastSimpleQuestion;
export type ListeningQuestionAdmin = PastSimpleQuestionAdmin;

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
  exam_type: "past_simple_exam" | "present_simple_exam"
  | "present_perfect_exam" | "listening_practice";
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

export type PresentSimpleAttemptSummary = PastSimpleAttemptSummary;

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
