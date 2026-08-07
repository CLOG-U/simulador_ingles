import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentDashboard } from "../src/features/student/StudentDashboard";
import { examApi, pastSimpleApi } from "../src/lib/endpoints";

vi.mock("../src/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "student-1",
      username: "student",
      full_name: "Student One",
      role: "STUDENT",
    },
  }),
}));

vi.mock("../src/lib/endpoints", () => ({
  examApi: {
    config: vi.fn(),
    attemptStatus: vi.fn(),
  },
  pastSimpleApi: {
    config: vi.fn(),
    attemptStatus: vi.fn(),
  },
}));

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StudentDashboard", () => {
  beforeEach(() => {
    vi.mocked(examApi.config).mockResolvedValue({
      exam_type: "verb_exam",
      is_enabled: true,
      question_count: 20,
      passing_percentage: 70,
      duration_minutes: null,
      max_attempts: 1,
      review_policy: "FULL",
    });
    vi.mocked(examApi.attemptStatus).mockResolvedValue({
      exam_type: "verb_exam",
      is_available: true,
      has_open_attempt: false,
      open_attempt_id: null,
      submitted_count: 0,
      max_attempts: 1,
      can_start_new: true,
      last_submitted: null,
    });
    vi.mocked(pastSimpleApi.config).mockResolvedValue({
      exam_type: "past_simple_exam",
      is_enabled: false,
      question_count: 24,
      passing_percentage: 70,
      duration_minutes: null,
      review_policy: "FULL",
      title: "Past Simple Exam",
    });
    vi.mocked(pastSimpleApi.attemptStatus).mockResolvedValue({
      exam_type: "past_simple_exam",
      is_available: false,
      has_open_attempt: false,
      open_attempt_id: null,
      submitted_count: 0,
      max_attempts: 1,
      can_start_new: false,
      last_submitted: null,
    });
  });

  it("shows independent Verb and Past Simple exam cards", async () => {
    renderDashboard();
    expect(await screen.findByRole("heading", { name: "Verb Exam" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Past Simple Exam" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });
});
