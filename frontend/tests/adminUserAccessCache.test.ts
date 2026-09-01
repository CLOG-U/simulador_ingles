import { describe, expect, it } from "vitest";
import type { AdminUser, ExamAccess } from "../src/lib/types";
import {
  applyAccessUpdatesToUsers,
  bulkAccessUpdates,
  enabledCountLabel,
  EXAM_ACCESS_TYPES,
  PRACTICE_ACCESS_TYPES,
} from "../src/features/admin/adminUserAccessCache";

function student(examAccess: ExamAccess[] = []): AdminUser {
  return {
    id: "student-1",
    username: "ana",
    full_name: "Ana",
    role: "STUDENT",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00Z",
    last_login_at: null,
    exam_access: examAccess,
  };
}

describe("adminUserAccessCache", () => {
  it("cuenta módulos habilitados para el badge visible", () => {
    expect(enabledCountLabel([true, false, true, undefined])).toBe("2/4 hab.");
  });

  it("al bloquear todo actualiza exámenes y prácticas independientes", () => {
    const users = applyAccessUpdatesToUsers(
      [
        student([
          {
            exam_type: "verb_exam",
            is_enabled: true,
            practice_enabled: false,
            allowed_attempts: 2,
          },
          {
            exam_type: "verb_base_exam",
            is_enabled: true,
            practice_enabled: true,
            allowed_attempts: 1,
          },
        ]),
      ],
      "student-1",
      bulkAccessUpdates(false, false),
    );

    const access = Object.fromEntries(
      (users[0].exam_access ?? []).map((item) => [item.exam_type, item]),
    );

    expect(access.verb_exam.is_enabled).toBe(false);
    expect(access.verb_base_exam.is_enabled).toBe(false);
    expect(access.verb_base_exam.practice_enabled).toBe(false);
    expect(access.verb_past_exam.practice_enabled).toBe(false);
    expect(access.listening_practice.is_enabled).toBe(false);
    expect(access.listening_practice.practice_enabled).toBe(false);
    expect(access.verb_exam.allowed_attempts).toBe(2);
    expect(EXAM_ACCESS_TYPES).toHaveLength(6);
    expect(PRACTICE_ACCESS_TYPES).toHaveLength(6);
  });

  it("al habilitar solo práctica no cambia el estado de los exámenes", () => {
    const users = applyAccessUpdatesToUsers(
      [
        student([
          {
            exam_type: "past_simple_exam",
            is_enabled: false,
            practice_enabled: false,
            allowed_attempts: 1,
          },
        ]),
      ],
      "student-1",
      bulkAccessUpdates(undefined, true),
    );
    const past = users[0].exam_access?.find(
      (item) => item.exam_type === "past_simple_exam",
    );
    const verbExam = users[0].exam_access?.find(
      (item) => item.exam_type === "verb_exam",
    );

    expect(past?.is_enabled).toBe(false);
    expect(past?.practice_enabled).toBe(true);
    expect(verbExam).toBeUndefined();
  });
});
