import type { AdminUser, ExamAccess, ExamType } from "../../lib/types";

export const EXAM_ACCESS_TYPES: ExamType[] = [
  "verb_exam",
  "verb_base_exam",
  "past_simple_exam",
  "present_simple_exam",
  "present_perfect_exam",
  "listening_practice",
];

export const PRACTICE_ACCESS_TYPES: ExamType[] = [
  "verb_base_exam",
  "verb_past_exam",
  "past_simple_exam",
  "present_simple_exam",
  "present_perfect_exam",
  "listening_practice",
];

export type AccessUpdate = Pick<ExamAccess, "exam_type"> &
  Partial<Pick<ExamAccess, "is_enabled" | "practice_enabled">>;

export function enabledCountLabel(flags: Array<boolean | undefined>) {
  return `${flags.filter(Boolean).length}/${flags.length} hab.`;
}

function ensureAccessItem(
  byType: Map<ExamType, ExamAccess>,
  examType: ExamType,
): ExamAccess {
  const current = byType.get(examType);
  if (current) return current;
  const created: ExamAccess = {
    exam_type: examType,
    is_enabled: false,
    practice_enabled: false,
    allowed_attempts: 1,
  };
  byType.set(examType, created);
  return created;
}

export function applyAccessUpdatesToUsers(
  items: AdminUser[],
  userId: string,
  updates: AccessUpdate[],
): AdminUser[] {
  return items.map((user) => {
    if (user.id !== userId) return user;
    const byType = new Map(
      (user.exam_access ?? []).map((item) => [item.exam_type, { ...item }]),
    );
    for (const update of updates) {
      const current = ensureAccessItem(byType, update.exam_type);
      byType.set(update.exam_type, {
        ...current,
        ...(update.is_enabled !== undefined
          ? { is_enabled: update.is_enabled }
          : {}),
        ...(update.practice_enabled !== undefined
          ? { practice_enabled: update.practice_enabled }
          : {}),
      });
    }
    return { ...user, exam_access: [...byType.values()] };
  });
}

export function bulkAccessUpdates(
  exams?: boolean,
  practices?: boolean,
): AccessUpdate[] {
  const updates = new Map<ExamType, AccessUpdate>();
  if (exams !== undefined) {
    for (const examType of EXAM_ACCESS_TYPES) {
      updates.set(examType, { exam_type: examType, is_enabled: exams });
    }
  }
  if (practices !== undefined) {
    for (const examType of PRACTICE_ACCESS_TYPES) {
      const current = updates.get(examType) ?? { exam_type: examType };
      updates.set(examType, { ...current, practice_enabled: practices });
    }
  }
  return [...updates.values()];
}
