import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { HomePage } from "../src/routes/HomePage";

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("HomePage", () => {
  it("muestra el título del simulador", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole("heading", { name: /simulador de verbos/i })).toBeInTheDocument();
  });
});
