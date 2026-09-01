import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUsersPage } from "../src/features/admin/AdminUsersPage";
import { adminApi } from "../src/lib/endpoints";
import type { AdminUser, ExamAccess, ExamType } from "../src/lib/types";

vi.mock("../src/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "profe",
      full_name: "Profesor",
      role: "SUPERADMIN",
    },
    logout: vi.fn(),
  }),
}));

vi.mock("../src/lib/endpoints", () => ({
  adminApi: {
    listUsers: vi.fn(),
    updateExamAccessBulk: vi.fn(),
    updateExamAccess: vi.fn(),
  },
}));

const EXAM_TYPES: ExamType[] = [
  "verb_exam",
  "verb_base_exam",
  "verb_past_exam",
  "past_simple_exam",
  "present_simple_exam",
  "present_perfect_exam",
  "listening_practice",
];

function enabledAccess(): ExamAccess[] {
  return EXAM_TYPES.map((exam_type) => ({
    exam_type,
    is_enabled: true,
    practice_enabled: true,
    allowed_attempts: 1,
    submitted_attempts: 0,
    remaining_attempts: 1,
    practice_submitted_attempts: 0,
  }));
}

const student: AdminUser = {
  id: "student-1",
  username: "ana",
  full_name: "Ana Pérez",
  role: "STUDENT",
  is_active: true,
  must_change_password: false,
  created_at: "2026-01-01T00:00:00Z",
  last_login_at: null,
  exam_access: enabledAccess(),
};

function renderUsersPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminUsersPage acceso general", () => {
  beforeEach(() => {
    vi.mocked(adminApi.listUsers).mockResolvedValue({
      items: [student],
      total: 1,
    });
    vi.mocked(adminApi.updateExamAccessBulk).mockImplementation(
      () => new Promise(() => {}),
    );
  });

  it("al bloquear todo actualiza las tarjetas independientes en pantalla", async () => {
    renderUsersPage();

    expect(await screen.findByText("ana")).toBeInTheDocument();
    expect(screen.getAllByText("Hab.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("6/6 hab.").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Bloquear todo" }));

    await waitFor(() => {
      expect(screen.queryAllByText("Hab.")).toHaveLength(0);
      expect(screen.getAllByText("Bloq.").length).toBeGreaterThan(0);
      expect(screen.getAllByText("0/6 hab.").length).toBeGreaterThan(0);
      expect(screen.getAllByText("0/12 hab.").length).toBeGreaterThan(0);
    });
  });
});
