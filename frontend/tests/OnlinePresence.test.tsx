import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  formatSeenAgo,
  OnlinePresenceBoard,
  OnlinePresenceWidget,
} from "../src/features/admin/OnlinePresence";
import { adminApi } from "../src/lib/endpoints";

vi.mock("../src/lib/endpoints", () => ({
  adminApi: {
    onlineUsers: vi.fn(),
  },
}));

function renderOnline(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OnlinePresence", () => {
  it("describe la actividad reciente en español", () => {
    const now = Date.parse("2026-09-03T22:10:00Z");
    expect(formatSeenAgo("2026-09-03T22:09:40Z", now)).toBe("ahora");
    expect(formatSeenAgo("2026-09-03T22:09:00Z", now)).toBe("hace 1 min");
    expect(formatSeenAgo("2026-09-03T22:07:00Z", now)).toBe("hace 3 min");
  });

  it("muestra quién está online en el mostrador del resumen", async () => {
    vi.mocked(adminApi.onlineUsers).mockResolvedValue({
      count: 2,
      student_count: 1,
      threshold_minutes: 3,
      items: [
        {
          id: "s1",
          username: "ana",
          full_name: "Ana Pérez",
          role: "STUDENT",
          last_seen_at: new Date().toISOString(),
        },
        {
          id: "a1",
          username: "profe",
          full_name: "Profesor",
          role: "ADMIN",
          last_seen_at: new Date().toISOString(),
        },
      ],
    });

    renderOnline(<OnlinePresenceBoard />);

    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("En línea ahora")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Profesor")).toBeInTheDocument();
  });

  it("resume el conteo en el encabezado", async () => {
    vi.mocked(adminApi.onlineUsers).mockResolvedValue({
      count: 1,
      student_count: 1,
      threshold_minutes: 3,
      items: [
        {
          id: "s1",
          username: "ana",
          full_name: "Ana Pérez",
          role: "STUDENT",
          last_seen_at: new Date().toISOString(),
        },
      ],
    });

    renderOnline(<OnlinePresenceWidget />);

    expect(await screen.findByText(/1 en línea/)).toBeInTheDocument();
    expect(screen.getByText("Quién está online")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });
});
