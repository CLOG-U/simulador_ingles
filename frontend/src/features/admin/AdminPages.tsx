import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";

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

  const save = async (isEnabled = data?.is_enabled ?? true) => {
    await adminApi.updateExamConfig({
      is_enabled: isEnabled,
      passing_percentage: passing === "" ? undefined : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    void queryClient.invalidateQueries({ queryKey: ["admin-config"] });
  };

  const toggleAvailability = async () => {
    if (!data) return;
    await adminApi.updateExamConfig({ is_enabled: !data.is_enabled });
    void queryClient.invalidateQueries({ queryKey: ["admin-config"] });
  };

  return (
    <AppShell title="Configuración" nav={adminNav}>
      <section className="card max-w-md space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Verb Exam</h2>
          <button
            type="button"
            className={`min-h-11 rounded-xl px-3 ${
              data?.is_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!data}
            onClick={() => void toggleAvailability()}
          >
            {data?.is_enabled ? "Habilitado" : "Deshabilitado"}
          </button>
        </div>
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const pageSize = 20;

  const studentsQuery = useQuery({
    queryKey: ["admin-results-students", search, page],
    queryFn: () =>
      adminApi.listUsers({
        role: "STUDENT",
        search: search.trim() || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const total = studentsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const students = studentsQuery.data?.items ?? [];

  return (
    <AppShell title="Reporte general" nav={adminNav} wide>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
          <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Reporte general</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Entra a cada estudiante para ver su reporte general y, desde ahí,
              los reportes por examen o práctica.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 p-6">
            <Link to="/admin/exams/verb" className="btn-admin-secondary w-auto px-4">
              Reportes Verb Exam
            </Link>
            <Link
              to="/admin/exams/past-simple"
              className="btn-admin-secondary w-auto px-4"
            >
              Reportes Past Simple Exam
            </Link>
            <Link
              to="/admin/practice/past-simple"
              className="btn-admin-secondary w-auto px-4"
            >
              Reportes Practice
            </Link>
            <button
              type="button"
              className="btn-primary"
              disabled={isExporting}
              onClick={async () => {
                setIsExporting(true);
                setExportError("");
                try {
                  await adminApi.downloadAttemptsCsv();
                } catch (error) {
                  setExportError(
                    error instanceof Error
                      ? error.message
                      : "No se pudo exportar el reporte.",
                  );
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              {isExporting ? "Exportando…" : "Exportar CSV"}
            </button>
          </div>
        </section>

        {exportError && <p className="text-sm text-danger">{exportError}</p>}

        <section className="card space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-brand-primary">
                Estudiantes
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {total} estudiante{total === 1 ? "" : "s"}
              </p>
            </div>
            <label className="block min-w-[16rem] flex-1 text-sm sm:max-w-sm">
              <span className="mb-1 block font-medium">Buscar</span>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nombre o usuario…"
                className="w-full rounded-xl border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <QueryState
            isLoading={studentsQuery.isLoading}
            isError={studentsQuery.isError}
            error={studentsQuery.error}
            isEmpty={!students.length}
            emptyMessage="No hay estudiantes para mostrar."
          >
            <div className="admin-table-wrap">
              <table className="admin-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Estado</th>
                    <th>Verb Exam</th>
                    <th>Past Simple</th>
                    <th>Práctica</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const verbAccess = student.exam_access?.find(
                      (item) => item.exam_type === "verb_exam",
                    );
                    const pastAccess = student.exam_access?.find(
                      (item) => item.exam_type === "past_simple_exam",
                    );
                    return (
                      <tr key={student.id}>
                        <td>
                          <span className="font-semibold text-brand-primary">
                            {student.full_name}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {student.username}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              student.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {student.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          {student.attempts_used ??
                            verbAccess?.submitted_attempts ??
                            0}
                          /{student.attempts_max ?? verbAccess?.allowed_attempts ?? "—"}
                          {student.has_open_attempt ? " · en curso" : ""}
                        </td>
                        <td>{pastAccess?.submitted_attempts ?? 0}</td>
                        <td>{pastAccess?.practice_submitted_attempts ?? 0}</td>
                        <td>
                          <Link
                            to={`/admin/students/${student.id}/report`}
                            className="btn-admin-primary inline-flex w-auto min-w-[10rem] px-4"
                          >
                            Ver reporte general
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </QueryState>

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-gray-600">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  disabled={page <= 1 || studentsQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn-admin-secondary"
                  disabled={page >= totalPages || studentsQuery.isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
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
