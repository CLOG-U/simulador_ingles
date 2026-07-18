import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";

const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "En curso",
  SUBMITTED: "Entregado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

export function AdminVerbsPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-verbs", search],
    queryFn: () => adminApi.listVerbs(search || undefined),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.toggleVerb(id, is_active),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-verbs"] }),
  });

  return (
    <AppShell title="Banco de verbos" nav={adminNav}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar verbo…"
        className="mb-4 w-full rounded-xl border px-4 py-2"
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data?.items.length}
        emptyMessage="No hay verbos en el banco."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">#</th>
                <th className="py-2">Base</th>
                <th className="py-2">Pasado</th>
                <th className="py-2">Español</th>
                <th className="py-2">Activo</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((v) => (
                <tr key={v.id} className="border-b">
                  <td className="py-2">{v.source_order}</td>
                  <td className="py-2">{v.base_display}</td>
                  <td className="py-2">{v.past_display}</td>
                  <td className="py-2">{v.spanish_prompt}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="min-h-11 rounded-lg border px-3"
                      onClick={() => toggleMutation.mutate({ id: v.id, is_active: !v.is_active })}
                    >
                      {v.is_active ? "Sí" : "No"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </AppShell>
  );
}

export function AdminConfigPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-config"], queryFn: adminApi.getExamConfig });
  const [passing, setPassing] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");

  const save = async () => {
    await adminApi.updateExamConfig({
      passing_percentage: passing === "" ? undefined : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    void queryClient.invalidateQueries({ queryKey: ["admin-config"] });
  };

  return (
    <AppShell title="Configuración" nav={adminNav}>
      <section className="card max-w-md space-y-4">
        <p>Preguntas por intento: {data?.question_count ?? 20} (fijo en MVP)</p>
        <label className="block">
          Nota mínima (%)
          <input
            type="number"
            defaultValue={data?.passing_percentage}
            onChange={(e) => setPassing(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </label>
        <label className="block">
          Temporizador (minutos, vacío = desactivado)
          <input
            type="number"
            defaultValue={data?.duration_minutes ?? ""}
            onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : "")}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </label>
        <button type="button" className="btn-primary" onClick={() => void save()}>
          Guardar
        </button>
      </section>
    </AppShell>
  );
}

export function AdminResultsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-attempts"],
    queryFn: adminApi.listAttempts,
  });

  return (
    <AppShell title="Resultados" nav={adminNav}>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data?.items.length}
        emptyMessage="No hay resultados todavía."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Estudiante</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Nota</th>
                <th className="py-2">Aprobado</th>
                <th className="py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2">
                    <Link
                      to={`/admin/students/${row.student_id}/report`}
                      className="text-brand-primary underline"
                    >
                      {row.student_name}
                    </Link>
                    <span className="block text-xs text-gray-500">{row.student_username}</span>
                  </td>
                  <td className="py-2">
                    {ATTEMPT_STATUS_LABELS[row.status] ?? row.status}
                  </td>
                  <td className="py-2">
                    {row.percentage != null ? `${row.percentage.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2">
                    {row.status === "SUBMITTED" ? (row.passed ? "Sí" : "No") : "—"}
                  </td>
                  <td className="py-2">
                    <Link
                      to={`/admin/reports/${row.id}`}
                      className="text-brand-primary underline"
                    >
                      Ver evaluación
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </AppShell>
  );
}

export function AdminAuditPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: adminApi.auditLogs,
  });

  return (
    <AppShell title="Auditoría" nav={adminNav}>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data?.items.length}
        emptyMessage="No hay registros de auditoría."
      >
        <ul className="space-y-2 text-sm">
          {data?.items.map((log) => (
            <li key={log.id as string} className="card">
              <strong>{log.action as string}</strong> — {log.created_at as string}
            </li>
          ))}
        </ul>
      </QueryState>
    </AppShell>
  );
}
