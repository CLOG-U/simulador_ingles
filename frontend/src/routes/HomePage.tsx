import { useQuery } from "@tanstack/react-query";
import { checkHealth } from "../lib/api";

export function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    retry: 1,
  });

  return (
    <div className="min-h-screen">
      <header className="bg-brand-primary px-4 py-6 text-brand-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-brand-sky">Powerful English Academy</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Simulador de verbos</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <section className="card" aria-live="polite">
          <h2 className="text-lg font-semibold">Estado del sistema</h2>
          <p className="mt-2 text-gray-600">
            {isLoading && "Comprobando conexión con el servidor…"}
            {isError && "Sin conexión con el backend. Verifica que los servicios estén activos."}
            {!isLoading && !isError && data?.status === "ok" && "Backend conectado correctamente."}
          </p>
          <p className="mt-6 text-sm text-gray-500">
            Fase 1 — Base técnica. El flujo completo de evaluación se implementará en las
            siguientes fases.
          </p>
        </section>
      </main>
    </div>
  );
}
