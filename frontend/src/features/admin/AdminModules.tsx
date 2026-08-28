import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";
import { ModuleReportsSection } from "./AdminReportTables";

const TOPIC_LABELS: Record<string, string> = {
  interrogative_structure: "Interrogative structure",
  use_of_did: "Use of did",
  regular_irregular_verbs: "Regular and irregular verbs",
  short_answers: "Short answers",
  was_were: "Was and were",
  question_words: "Question Words",
  what: "What",
  where: "Where",
  when: "When",
  why: "Why",
  who: "Who",
  how: "How",
  affirmative: "Affirmative",
  negative: "Negative",
  interrogative: "Interrogative",
  identify: "Identify",
  order_words: "Order words",
  sentences: "Sentences",
  detail: "Detail",
  main_idea: "Main idea",
  present_simple: "Present Simple",
  past_simple: "Past Simple",
  present_perfect: "Present Perfect",
};

function ModuleCard({
  title,
  description,
  meta,
  to,
  cta,
  tone = "exam",
}: {
  title: string;
  description: string;
  meta?: string;
  to: string;
  cta: string;
  tone?: "exam" | "practice";
}) {
  const toneClass =
    tone === "practice"
      ? "border-brand-sky/30 bg-gradient-to-br from-brand-sky/10 to-white"
      : "border-brand-primary/20 bg-gradient-to-br from-brand-primary/[0.06] to-white";

  return (
    <section className={`card flex h-full flex-col border ${toneClass}`}>
      <h2 className="text-xl font-semibold text-brand-primary-dark">{title}</h2>
      <p className="mt-2 flex-1 text-sm text-gray-600">{description}</p>
      {meta && <p className="mt-3 text-sm font-medium text-brand-primary">{meta}</p>}
      <Link to={to} className="btn-primary mt-4">
        {cta}
      </Link>
    </section>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center rounded-xl border border-brand-primary/20 bg-white px-4 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary/5"
    >
      {label}
    </Link>
  );
}

/** Hub: listado de exámenes creados. */
export function AdminExamsHubPage() {
  const verbConfig = useQuery({
    queryKey: ["admin-config"],
    queryFn: adminApi.getExamConfig,
  });
  const verbBaseConfig = useQuery({
    queryKey: ["admin-verb-base-config"],
    queryFn: adminApi.getVerbBaseConfig,
  });
  const pastConfig = useQuery({
    queryKey: ["admin-past-simple-config"],
    queryFn: adminApi.getPastSimpleConfig,
  });
  const presentConfig = useQuery({
    queryKey: ["admin-present-simple-config"],
    queryFn: adminApi.getPresentSimpleConfig,
  });
  const perfectConfig = useQuery({
    queryKey: ["admin-present-perfect-config"],
    queryFn: adminApi.getPresentPerfectConfig,
  });
  const listeningExamConfig = useQuery({
    queryKey: ["admin-listening-config"],
    queryFn: adminApi.getListeningConfig,
  });

  return (
    <AppShell title="Exámenes" nav={adminNav}>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold">Exámenes</h2>
          <p className="mt-1 text-gray-600">
            Entra a cada examen para configurar nota mínima, temporizador y ver el
            banco de preguntas.
          </p>
        </section>
        <div className="grid gap-5 md:grid-cols-2">
          <ModuleCard
            title="Verb Exam"
            description="Completar base, pasado y significado en español de verbos ingleses."
            meta={
              verbConfig.data
                ? `${verbConfig.data.is_enabled ? "Habilitado" : "Deshabilitado"} · Nota mín. ${verbConfig.data.passing_percentage}% · ${
                    verbConfig.data.duration_minutes
                      ? `${verbConfig.data.duration_minutes} min`
                      : "Sin temporizador"
                  }`
                : "Cargando…"
            }
            to="/admin/exams/verb"
            cta="Abrir Verb Exam"
            tone="exam"
          />
          <ModuleCard
            title="Verb Base Form"
            description="Escribir solo la forma base y su significado en español (sin pasado)."
            meta={
              verbBaseConfig.data
                ? `${verbBaseConfig.data.is_enabled ? "Habilitado" : "Deshabilitado"} · Nota mín. ${verbBaseConfig.data.passing_percentage}% · ${
                    verbBaseConfig.data.duration_minutes
                      ? `${verbBaseConfig.data.duration_minutes} min`
                      : "Sin temporizador"
                  }`
                : "Cargando…"
            }
            to="/admin/exams/verb-base"
            cta="Abrir Verb Base Form"
            tone="exam"
          />
          <ModuleCard
            title="Past Simple Exam"
            description="Evaluación oficial de Past Simple con banco de 100 preguntas (24 por intento)."
            meta={
              pastConfig.data
                ? `${pastConfig.data.is_enabled ? "Habilitado" : "Deshabilitado"} · Nota mín. ${pastConfig.data.passing_percentage}% · ${
                    pastConfig.data.duration_minutes
                      ? `${pastConfig.data.duration_minutes} min`
                      : "Sin temporizador"
                  }`
                : "Cargando…"
            }
            to="/admin/exams/past-simple"
            cta="Abrir Past Simple Exam"
            tone="exam"
          />
          <ModuleCard
            title="Present Simple Exam"
            description="Evaluación oficial de Present Simple con banco de 100 preguntas (20 por intento)."
            meta={
              presentConfig.data
                ? `${presentConfig.data.is_enabled ? "Habilitado" : "Deshabilitado"} · Nota mín. ${presentConfig.data.passing_percentage}% · ${
                    presentConfig.data.duration_minutes
                      ? `${presentConfig.data.duration_minutes} min`
                      : "Sin temporizador"
                  }`
                : "Cargando…"
            }
            to="/admin/exams/present-simple"
            cta="Abrir Present Simple Exam"
            tone="exam"
          />
          <ModuleCard
            title="Present Perfect Exam"
            description="Evaluación oficial de Present Perfect con banco de 100 preguntas (20 por intento)."
            meta={
              perfectConfig.data
                ? `${perfectConfig.data.is_enabled ? "Habilitado" : "Deshabilitado"} · Nota mín. ${perfectConfig.data.passing_percentage}% · ${
                    perfectConfig.data.duration_minutes
                      ? `${perfectConfig.data.duration_minutes} min`
                      : "Sin temporizador"
                  }`
                : "Cargando…"
            }
            to="/admin/exams/present-perfect"
            cta="Abrir Present Perfect Exam"
            tone="exam"
          />
          <ModuleCard
            title="Listening Exam"
            description="Evaluación oficial de listening: Emma's Weekend, Learning English (Marcus) y Volleyball (Ryan)."
            meta={
              listeningExamConfig.data
                ? `${listeningExamConfig.data.is_enabled ? "Habilitado" : "Deshabilitado"} · Nota mín. ${listeningExamConfig.data.passing_percentage}% · ${
                    listeningExamConfig.data.duration_minutes
                      ? `${listeningExamConfig.data.duration_minutes} min`
                      : "Sin temporizador"
                  }`
                : "Cargando…"
            }
            to="/admin/exams/listening"
            cta="Abrir Listening Exam"
            tone="exam"
          />
        </div>
      </div>
    </AppShell>
  );
}

/** Hub: listado de prácticas. */
export function AdminPracticeHubPage() {
  const verbBaseConfig = useQuery({
    queryKey: ["admin-verb-base-config"],
    queryFn: adminApi.getVerbBaseConfig,
  });
  const pastConfig = useQuery({
    queryKey: ["admin-past-simple-config"],
    queryFn: adminApi.getPastSimpleConfig,
  });
  const simpleConfig = useQuery({
    queryKey: ["admin-present-simple-config"],
    queryFn: adminApi.getPresentSimpleConfig,
  });
  const perfectConfig = useQuery({
    queryKey: ["admin-present-perfect-config"],
    queryFn: adminApi.getPresentPerfectConfig,
  });
  const listeningConfig = useQuery({
    queryKey: ["admin-listening-config"],
    queryFn: adminApi.getListeningConfig,
  });

  return (
    <AppShell title="Práctica" nav={adminNav}>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold">Práctica</h2>
          <p className="mt-1 text-gray-600">
            Sesiones de entrenamiento. No cuentan como intento de examen.
          </p>
        </section>
        <div className="grid gap-5 md:grid-cols-2">
          <ModuleCard
            title="Verb Base Form Practice"
            description="Español ↔ forma base. Feedback inmediato y sin cupo de intentos."
            meta={
              verbBaseConfig.data
                ? `${verbBaseConfig.data.practice_enabled ? "Habilitada" : "Deshabilitada"} · Banco: ${verbBaseConfig.data.question_bank_size ?? "—"} verbos`
                : "Cargando…"
            }
            to="/admin/practice/verb-base"
            cta="Abrir Verb Base Form Practice"
            tone="practice"
          />
          <ModuleCard
            title="Past Simple Practice"
            description="Misma banco de preguntas del examen, con feedback inmediato y sin cupo de intentos."
            meta={
              pastConfig.data
                ? `${pastConfig.data.practice_enabled ? "Habilitada" : "Deshabilitada"} · Banco: ${pastConfig.data.question_bank_size ?? "—"} preguntas`
                : "Cargando…"
            }
            to="/admin/practice/past-simple"
            cta="Abrir Past Simple Practice"
            tone="practice"
          />
          <ModuleCard
            title="Present Simple Practice"
            description="Mismo banco del examen, con feedback inmediato y sin cupo de intentos."
            meta={
              simpleConfig.data
                ? `${simpleConfig.data.practice_enabled ? "Habilitada" : "Deshabilitada"} · Banco: ${simpleConfig.data.question_bank_size ?? "—"} preguntas`
                : "Cargando…"
            }
            to="/admin/practice/present-simple"
            cta="Abrir Present Simple Practice"
            tone="practice"
          />
          <ModuleCard
            title="Present Perfect Practice"
            description="Mismo banco del examen, con feedback inmediato y sin cupo de intentos."
            meta={
              perfectConfig.data
                ? `${perfectConfig.data.practice_enabled ? "Habilitada" : "Deshabilitada"} · Banco: ${perfectConfig.data.question_bank_size ?? "—"} preguntas`
                : "Cargando…"
            }
            to="/admin/practice/present-perfect"
            cta="Abrir Present Perfect Practice"
            tone="practice"
          />
          <ModuleCard
            title="Listening Practice"
            description="Comprensión auditiva con varios clips. Feedback inmediato y sin cupo de intentos."
            meta={
              listeningConfig.data
                ? `${listeningConfig.data.practice_enabled ? "Habilitada" : "Deshabilitada"} · ${listeningConfig.data.clip_count ?? "—"} clip(s) · Banco: ${listeningConfig.data.question_bank_size ?? "—"} preguntas`
                : "Cargando…"
            }
            to="/admin/practice/listening"
            cta="Abrir Listening Practice"
            tone="practice"
          />
        </div>
      </div>
    </AppShell>
  );
}

/** Verb Exam: configuración + banco de verbos. */
export function AdminVerbExamPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-config"],
    queryFn: adminApi.getExamConfig,
  });
  const [search, setSearch] = useState("");
  const [passing, setPassing] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");
  const [notice, setNotice] = useState("");

  const verbsQuery = useQuery({
    queryKey: ["admin-verbs", search],
    queryFn: () => adminApi.listVerbs(search || undefined),
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-attempts", "verb_exam"],
    queryFn: adminApi.listAttempts,
  });

  useEffect(() => {
    if (!config) return;
    setPassing(config.passing_percentage);
    setDuration(config.duration_minutes ?? "");
  }, [config]);

  const toggleVerb = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.toggleVerb(id, is_active),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-verbs"] }),
  });

  const saveSettings = async () => {
    await adminApi.updateExamConfig({
      passing_percentage: passing === "" ? config?.passing_percentage : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    setNotice("Configuración de Verb Exam guardada.");
    void queryClient.invalidateQueries({ queryKey: ["admin-config"] });
  };

  const toggleExam = async () => {
    if (!config) return;
    await adminApi.updateExamConfig({ is_enabled: !config.is_enabled });
    setNotice(
      !config.is_enabled ? "Verb Exam habilitado globalmente." : "Verb Exam deshabilitado.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-config"] });
  };

  return (
    <AppShell title="Verb Exam" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/exams" label="← Exámenes" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.is_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void toggleExam()}
          >
            {config?.is_enabled ? "Examen habilitado" : "Examen deshabilitado"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
          <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración del examen</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Nota mínima y temporizador de Verb Exam.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Preguntas por intento: {config?.question_count ?? 20} (fijo). También
              debes habilitar a cada estudiante en Usuarios.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Nota mínima (%)
                <input
                  type="number"
                  value={passing}
                  onChange={(e) => setPassing(Number(e.target.value))}
                  className="admin-search mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Temporizador (minutos, vacío = desactivado)
                <input
                  type="number"
                  value={duration}
                  onChange={(e) =>
                    setDuration(e.target.value ? Number(e.target.value) : "")
                  }
                  className="admin-search mt-1"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!config}
              onClick={() => void saveSettings()}
            >
              Guardar configuración
            </button>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <details className="admin-collapsible">
          <summary>
            <div>
              <h2 className="text-xl font-semibold">Banco de verbos</h2>
              <p className="mt-1 text-sm text-gray-600">
                {verbsQuery.data?.total != null
                  ? `${verbsQuery.data.total} verbo(s) en el banco. Despliega para consultar o activar/desactivar.`
                  : "Despliega para consultar o activar/desactivar verbos del banco."}
              </p>
            </div>
            <span className="admin-collapsible-chevron" aria-hidden>
              ▾
            </span>
          </summary>
          <div className="admin-collapsible-body">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar verbo…"
              className="admin-search"
            />
            <QueryState
              isLoading={verbsQuery.isLoading}
              isError={verbsQuery.isError}
              error={verbsQuery.error}
              isEmpty={!verbsQuery.data?.items.length}
              emptyMessage="No hay verbos en el banco."
            >
              <div className="admin-table-wrap">
                <table className="admin-table min-w-[640px]">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Base</th>
                      <th>Pasado</th>
                      <th>Español</th>
                      <th>Activo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verbsQuery.data?.items.map((v) => (
                      <tr key={v.id}>
                        <td>{v.source_order}</td>
                        <td className="font-medium">{v.base_display}</td>
                        <td>{v.past_display}</td>
                        <td>{v.spanish_prompt}</td>
                        <td>
                          <button
                            type="button"
                            className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${
                              v.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                            onClick={() =>
                              toggleVerb.mutate({ id: v.id, is_active: !v.is_active })
                            }
                          >
                            {v.is_active ? "Activo" : "Inactivo"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </QueryState>
          </div>
        </details>

        <ModuleReportsSection
          title="Reportes de Verb Exam"
          description="Intentos de este examen. Entra al reporte específico de cada evaluación."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/exams/verb/reports/${id}`}
          emptyMessage="Aún no hay intentos de Verb Exam."
        />
      </div>
    </AppShell>
  );
}

/** Verb Base Form: configuración + reportes. */
export function AdminVerbBaseExamPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-verb-base-config"],
    queryFn: adminApi.getVerbBaseConfig,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-attempts", "verb_base_exam"],
    queryFn: () => adminApi.listVerbBaseAttempts("exam"),
  });
  const [passing, setPassing] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!config) return;
    setPassing(config.passing_percentage);
    setDuration(config.duration_minutes ?? "");
  }, [config]);

  const saveSettings = async () => {
    await adminApi.updateVerbBaseConfig({
      passing_percentage:
        passing === "" ? config?.passing_percentage : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    setNotice("Configuración de Verb Base Form guardada.");
    void queryClient.invalidateQueries({ queryKey: ["admin-verb-base-config"] });
  };

  const toggleExam = async () => {
    if (!config) return;
    await adminApi.updateVerbBaseConfig({ is_enabled: !config.is_enabled });
    setNotice(
      !config.is_enabled
        ? "Verb Base Form habilitado globalmente."
        : "Verb Base Form deshabilitado.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-verb-base-config"] });
  };

  return (
    <AppShell title="Verb Base Form" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/exams" label="← Exámenes" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.is_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void toggleExam()}
          >
            {config?.is_enabled ? "Examen habilitado" : "Examen deshabilitado"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
          <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración del examen</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Nota mínima y temporizador de Verb Base Form.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Preguntas por intento: {config?.question_count ?? 20} (fijo). Usa el
              banco de verbos activo. También debes habilitar a cada estudiante en
              Usuarios.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Nota mínima (%)
                <input
                  type="number"
                  value={passing}
                  onChange={(e) => setPassing(Number(e.target.value))}
                  className="admin-search mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Temporizador (minutos, vacío = desactivado)
                <input
                  type="number"
                  value={duration}
                  onChange={(e) =>
                    setDuration(e.target.value ? Number(e.target.value) : "")
                  }
                  className="admin-search mt-1"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!config}
              onClick={() => void saveSettings()}
            >
              Guardar configuración
            </button>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <ModuleReportsSection
          title="Reportes de Verb Base Form"
          description="Intentos de este examen. Entra al reporte específico de cada evaluación."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/exams/verb-base/reports/${id}`}
          emptyMessage="Aún no hay intentos de Verb Base Form."
        />
      </div>
    </AppShell>
  );
}

/** Verb Base Form Practice: habilitación + reportes. */
export function AdminVerbBasePracticePage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-verb-base-config"],
    queryFn: adminApi.getVerbBaseConfig,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-attempts", "verb_base_practice"],
    queryFn: () => adminApi.listVerbBaseAttempts("practice"),
  });
  const [notice, setNotice] = useState("");

  const togglePractice = async () => {
    if (!config) return;
    await adminApi.updateVerbBaseConfig({
      practice_enabled: !config.practice_enabled,
    });
    setNotice(
      !config.practice_enabled
        ? "Verb Base Form Practice habilitada globalmente."
        : "Verb Base Form Practice deshabilitada.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-verb-base-config"] });
  };

  return (
    <AppShell title="Verb Base Form Practice" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/practice" label="← Práctica" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.practice_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void togglePractice()}
          >
            {config?.practice_enabled
              ? "Práctica habilitada"
              : "Práctica deshabilitada"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-sky/30 bg-white shadow-sm">
          <div className="border-b border-brand-sky/20 bg-gradient-to-r from-brand-sky to-brand-primary px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración de la práctica</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Entrenamiento con feedback. No usa nota mínima ni temporizador.
            </p>
          </div>
          <div className="space-y-3 p-6">
            <p className="text-sm text-gray-600">
              Banco compartido con el examen: {config?.question_bank_size ?? "—"}{" "}
              verbos activos · Cada sesión toma {config?.question_count ?? 20}.
              Sin cupo de intentos; también se habilita por estudiante en Usuarios.
            </p>
            <p className="text-sm text-gray-600">
              La nota mínima y el temporizador del examen oficial se configuran en{" "}
              <Link
                to="/admin/exams/verb-base"
                className="font-semibold text-brand-primary underline"
              >
                Verb Base Form
              </Link>
              .
            </p>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <ModuleReportsSection
          title="Reportes de Verb Base Form Practice"
          description="Sesiones de práctica. Entra al reporte específico de cada sesión."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/practice/verb-base/reports/${id}`}
          emptyMessage="Aún no hay sesiones de práctica."
        />
      </div>
    </AppShell>
  );
}

/** Past Simple Exam: configuración del examen + banco. */
export function AdminPastSimpleExamPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-past-simple-config"],
    queryFn: adminApi.getPastSimpleConfig,
  });
  const questionsQuery = useQuery({
    queryKey: ["admin-past-simple-questions"],
    queryFn: adminApi.listPastSimpleQuestions,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-past-simple-attempts", "exam"],
    queryFn: () => adminApi.listPastSimpleAttempts("exam"),
  });
  const [passing, setPassing] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!config) return;
    setPassing(config.passing_percentage);
    setDuration(config.duration_minutes ?? "");
  }, [config]);

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.togglePastSimpleQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-past-simple-questions"],
      }),
  });

  const saveSettings = async () => {
    await adminApi.updatePastSimpleConfig({
      passing_percentage:
        passing === "" ? config?.passing_percentage : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    setNotice("Configuración de Past Simple Exam guardada.");
    void queryClient.invalidateQueries({ queryKey: ["admin-past-simple-config"] });
  };

  const toggleExam = async () => {
    if (!config) return;
    await adminApi.updatePastSimpleConfig({ is_enabled: !config.is_enabled });
    setNotice(
      !config.is_enabled
        ? "Past Simple Exam habilitado globalmente."
        : "Past Simple Exam deshabilitado.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-past-simple-config"] });
  };

  return (
    <AppShell title="Past Simple Exam" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/exams" label="← Exámenes" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.is_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void toggleExam()}
          >
            {config?.is_enabled ? "Examen habilitado" : "Examen deshabilitado"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
          <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración del examen</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Nota mínima y temporizador del examen oficial Past Simple.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Banco: {config?.question_bank_size ?? "—"} preguntas · Cada intento
              toma {config?.question_count ?? 24} (2 por tema). La práctica se
              gestiona en el módulo Práctica.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Nota mínima (%)
                <input
                  type="number"
                  value={passing}
                  onChange={(e) => setPassing(Number(e.target.value))}
                  className="admin-search mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Temporizador (minutos, vacío = sin límite)
                <input
                  type="number"
                  value={duration}
                  onChange={(e) =>
                    setDuration(e.target.value ? Number(e.target.value) : "")
                  }
                  className="admin-search mt-1"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!config}
              onClick={() => void saveSettings()}
            >
              Guardar configuración
            </button>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <PastSimpleQuestionsSection
          questions={questionsQuery.data?.items}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
          error={questionsQuery.error}
          onToggle={(id, active) => toggleQuestion.mutate({ id, active })}
        />

        <ModuleReportsSection
          title="Reportes de Past Simple Exam"
          description="Intentos del examen oficial. Entra al reporte específico de cada evaluación."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/exams/past-simple/reports/${id}`}
          emptyMessage="Aún no hay intentos de Past Simple Exam."
        />
      </div>
    </AppShell>
  );
}

/** Present Simple Exam: configuración + banco + reportes. */
export function AdminPresentSimpleExamPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-present-simple-config"],
    queryFn: adminApi.getPresentSimpleConfig,
  });
  const questionsQuery = useQuery({
    queryKey: ["admin-present-simple-questions"],
    queryFn: adminApi.listPresentSimpleQuestions,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-present-simple-attempts", "exam"],
    queryFn: () => adminApi.listPresentSimpleAttempts("exam"),
  });
  const [passing, setPassing] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!config) return;
    setPassing(config.passing_percentage);
    setDuration(config.duration_minutes ?? "");
  }, [config]);

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.togglePresentSimpleQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-present-simple-questions"],
      }),
  });

  const saveSettings = async () => {
    await adminApi.updatePresentSimpleConfig({
      passing_percentage:
        passing === "" ? config?.passing_percentage : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    setNotice("Configuración de Present Simple Exam guardada.");
    void queryClient.invalidateQueries({
      queryKey: ["admin-present-simple-config"],
    });
  };

  const toggleExam = async () => {
    if (!config) return;
    await adminApi.updatePresentSimpleConfig({
      is_enabled: !config.is_enabled,
    });
    setNotice(
      !config.is_enabled
        ? "Present Simple Exam habilitado globalmente."
        : "Present Simple Exam deshabilitado.",
    );
    void queryClient.invalidateQueries({
      queryKey: ["admin-present-simple-config"],
    });
  };

  return (
    <AppShell title="Present Simple Exam" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/exams" label="← Exámenes" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.is_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void toggleExam()}
          >
            {config?.is_enabled ? "Examen habilitado" : "Examen deshabilitado"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
          <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración del examen</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Nota mínima y temporizador del examen oficial Present Simple.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Banco: {config?.question_bank_size ?? "—"} preguntas · Cada intento
              toma {config?.question_count ?? 20}. Habilita también a cada
              estudiante en Usuarios.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Nota mínima (%)
                <input
                  type="number"
                  value={passing}
                  onChange={(e) => setPassing(Number(e.target.value))}
                  className="admin-search mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Temporizador (minutos, vacío = sin límite)
                <input
                  type="number"
                  value={duration}
                  onChange={(e) =>
                    setDuration(e.target.value ? Number(e.target.value) : "")
                  }
                  className="admin-search mt-1"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!config}
              onClick={() => void saveSettings()}
            >
              Guardar configuración
            </button>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <PastSimpleQuestionsSection
          questions={questionsQuery.data?.items}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
          error={questionsQuery.error}
          onToggle={(id, active) => toggleQuestion.mutate({ id, active })}
        />

        <ModuleReportsSection
          title="Reportes de Present Simple Exam"
          description="Intentos del examen oficial. Entra al reporte específico de cada evaluación."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/exams/present-simple/reports/${id}`}
          emptyMessage="Aún no hay intentos de Present Simple Exam."
        />
      </div>
    </AppShell>
  );
}

/** Past Simple Practice: habilitación + banco de preguntas. */
export function AdminPastSimplePracticePage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-past-simple-config"],
    queryFn: adminApi.getPastSimpleConfig,
  });
  const questionsQuery = useQuery({
    queryKey: ["admin-past-simple-questions"],
    queryFn: adminApi.listPastSimpleQuestions,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-past-simple-attempts", "practice"],
    queryFn: () => adminApi.listPastSimpleAttempts("practice"),
  });
  const [notice, setNotice] = useState("");

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.togglePastSimpleQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-past-simple-questions"],
      }),
  });

  const togglePractice = async () => {
    if (!config) return;
    await adminApi.updatePastSimpleConfig({
      practice_enabled: !config.practice_enabled,
    });
    setNotice(
      !config.practice_enabled
        ? "Past Simple Practice habilitada globalmente."
        : "Past Simple Practice deshabilitada.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-past-simple-config"] });
  };

  return (
    <AppShell title="Past Simple Practice" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/practice" label="← Práctica" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.practice_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void togglePractice()}
          >
            {config?.practice_enabled
              ? "Práctica habilitada"
              : "Práctica deshabilitada"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-sky/30 bg-white shadow-sm">
          <div className="border-b border-brand-sky/20 bg-gradient-to-r from-brand-sky to-brand-primary px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración de la práctica</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Entrenamiento con feedback. No usa nota mínima ni temporizador.
            </p>
          </div>
          <div className="space-y-3 p-6">
            <p className="text-sm text-gray-600">
              Banco compartido con el examen: {config?.question_bank_size ?? "—"}{" "}
              preguntas · Cada sesión toma {config?.question_count ?? 24}. Sin
              cupo de intentos; también se habilita por estudiante en Usuarios.
            </p>
            <p className="text-sm text-gray-600">
              La nota mínima y el temporizador del examen oficial se configuran en{" "}
              <Link
                to="/admin/exams/past-simple"
                className="font-semibold text-brand-primary underline"
              >
                Past Simple Exam
              </Link>
              .
            </p>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <PastSimpleQuestionsSection
          questions={questionsQuery.data?.items}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
          error={questionsQuery.error}
          onToggle={(id, active) => toggleQuestion.mutate({ id, active })}
        />

        <ModuleReportsSection
          title="Reportes de Past Simple Practice"
          description="Sesiones de práctica. Entra al reporte específico de cada sesión."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/practice/past-simple/reports/${id}`}
          emptyMessage="Aún no hay sesiones de práctica."
        />
      </div>
    </AppShell>
  );
}

function PastSimpleQuestionsSection({
  questions,
  isLoading,
  isError,
  error,
  onToggle,
}: {
  questions?: {
    id: string;
    topic: string;
    question_type: string;
    question: string;
    correct_answer: string;
    active: boolean;
    clip_title?: string | null;
  }[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onToggle: (id: string, active: boolean) => void;
}) {
  const count = questions?.length ?? 0;
  const showClip = Boolean(questions?.some((item) => item.clip_title));

  return (
    <details className="admin-collapsible">
      <summary>
        <div>
          <h2 className="text-xl font-semibold">Banco de preguntas</h2>
          <p className="mt-1 text-sm text-gray-600">
            {count
              ? `${count} pregunta(s). Despliega para consultar o activar/desactivar ítems.`
              : "Despliega para consultar o activar/desactivar ítems del banco."}
          </p>
        </div>
        <span className="admin-collapsible-chevron" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="admin-collapsible-body">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!questions?.length}
          emptyMessage="No hay preguntas cargadas."
        >
          <div className="admin-table-wrap">
            <table className="admin-table min-w-[760px]">
              <thead>
                <tr>
                  {showClip ? <th>Audio</th> : null}
                  <th>Tema</th>
                  <th>Tipo</th>
                  <th>Pregunta</th>
                  <th>Respuesta</th>
                  <th>Activa</th>
                </tr>
              </thead>
              <tbody>
                {questions?.map((question) => (
                  <tr key={question.id}>
                    {showClip ? (
                      <td className="max-w-xs">{question.clip_title}</td>
                    ) : null}
                    <td>{TOPIC_LABELS[question.topic] ?? question.topic}</td>
                    <td>{question.question_type}</td>
                    <td className="max-w-sm">{question.question}</td>
                    <td className="max-w-xs">{question.correct_answer}</td>
                    <td>
                      <button
                        type="button"
                        className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${
                          question.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        onClick={() => onToggle(question.id, !question.active)}
                      >
                        {question.active ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>
    </details>
  );
}

/** Present Perfect Exam: configuración + banco + reportes. */
export function AdminPresentPerfectExamPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-present-perfect-config"],
    queryFn: adminApi.getPresentPerfectConfig,
  });
  const questionsQuery = useQuery({
    queryKey: ["admin-present-perfect-questions"],
    queryFn: adminApi.listPresentPerfectQuestions,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-present-perfect-attempts", "exam"],
    queryFn: () => adminApi.listPresentPerfectAttempts("exam"),
  });
  const [passing, setPassing] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!config) return;
    setPassing(config.passing_percentage);
    setDuration(config.duration_minutes ?? "");
  }, [config]);

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.togglePresentPerfectQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-present-perfect-questions"],
      }),
  });

  const saveSettings = async () => {
    await adminApi.updatePresentPerfectConfig({
      passing_percentage:
        passing === "" ? config?.passing_percentage : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    setNotice("Configuración de Present Perfect Exam guardada.");
    void queryClient.invalidateQueries({
      queryKey: ["admin-present-perfect-config"],
    });
  };

  const toggleExam = async () => {
    if (!config) return;
    await adminApi.updatePresentPerfectConfig({
      is_enabled: !config.is_enabled,
    });
    setNotice(
      !config.is_enabled
        ? "Present Perfect Exam habilitado globalmente."
        : "Present Perfect Exam deshabilitado.",
    );
    void queryClient.invalidateQueries({
      queryKey: ["admin-present-perfect-config"],
    });
  };

  return (
    <AppShell title="Present Perfect Exam" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/exams" label="← Exámenes" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.is_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void toggleExam()}
          >
            {config?.is_enabled ? "Examen habilitado" : "Examen deshabilitado"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
          <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración del examen</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Nota mínima y temporizador del examen oficial Present Perfect.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Banco: {config?.question_bank_size ?? "—"} preguntas · Cada intento
              toma {config?.question_count ?? 20}. Habilita también a cada
              estudiante en Usuarios.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Nota mínima (%)
                <input
                  type="number"
                  value={passing}
                  onChange={(e) => setPassing(Number(e.target.value))}
                  className="admin-search mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Temporizador (minutos, vacío = sin límite)
                <input
                  type="number"
                  value={duration}
                  onChange={(e) =>
                    setDuration(e.target.value ? Number(e.target.value) : "")
                  }
                  className="admin-search mt-1"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!config}
              onClick={() => void saveSettings()}
            >
              Guardar configuración
            </button>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <PastSimpleQuestionsSection
          questions={questionsQuery.data?.items}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
          error={questionsQuery.error}
          onToggle={(id, active) => toggleQuestion.mutate({ id, active })}
        />

        <ModuleReportsSection
          title="Reportes de Present Perfect Exam"
          description="Intentos del examen oficial. Entra al reporte específico de cada evaluación."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/exams/present-perfect/reports/${id}`}
          emptyMessage="Aún no hay intentos de Present Perfect Exam."
        />
      </div>
    </AppShell>
  );
}


/** Present Simple Practice: habilitación + banco de preguntas. */
export function AdminPresentSimplePracticePage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-present-simple-config"],
    queryFn: adminApi.getPresentSimpleConfig,
  });
  const questionsQuery = useQuery({
    queryKey: ["admin-present-simple-questions"],
    queryFn: adminApi.listPresentSimpleQuestions,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-present-simple-attempts", "practice"],
    queryFn: () => adminApi.listPresentSimpleAttempts("practice"),
  });
  const [notice, setNotice] = useState("");

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.togglePresentSimpleQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-present-simple-questions"],
      }),
  });

  const togglePractice = async () => {
    if (!config) return;
    await adminApi.updatePresentSimpleConfig({
      practice_enabled: !config.practice_enabled,
    });
    setNotice(
      !config.practice_enabled
        ? "Present Simple Practice habilitada globalmente."
        : "Present Simple Practice deshabilitada.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-present-simple-config"] });
  };

  return (
    <AppShell title="Present Simple Practice" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/practice" label="← Práctica" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.practice_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void togglePractice()}
          >
            {config?.practice_enabled
              ? "Práctica habilitada"
              : "Práctica deshabilitada"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-sky/30 bg-white shadow-sm">
          <div className="border-b border-brand-sky/20 bg-gradient-to-r from-brand-sky to-brand-primary px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración de la práctica</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Entrenamiento con feedback. No usa nota mínima ni temporizador.
            </p>
          </div>
          <div className="space-y-3 p-6">
            <p className="text-sm text-gray-600">
              Banco compartido con el examen: {config?.question_bank_size ?? "—"}{" "}
              preguntas · Cada sesión toma {config?.question_count ?? 20}. Sin
              cupo de intentos; también se habilita por estudiante en Usuarios.
            </p>
            <p className="text-sm text-gray-600">
              La nota mínima y el temporizador del examen oficial se configuran en{" "}
              <Link
                to="/admin/exams/present-simple"
                className="font-semibold text-brand-primary underline"
              >
                Present Simple Exam
              </Link>
              .
            </p>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <PastSimpleQuestionsSection
          questions={questionsQuery.data?.items}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
          error={questionsQuery.error}
          onToggle={(id, active) => toggleQuestion.mutate({ id, active })}
        />

        <ModuleReportsSection
          title="Reportes de Present Simple Practice"
          description="Sesiones de práctica. Entra al reporte específico de cada sesión."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/practice/present-simple/reports/${id}`}
          emptyMessage="Aún no hay sesiones de práctica."
        />
      </div>
    </AppShell>
  );
}

/** Present Perfect Practice: habilitación + banco de preguntas. */
export function AdminPresentPerfectPracticePage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-present-perfect-config"],
    queryFn: adminApi.getPresentPerfectConfig,
  });
  const questionsQuery = useQuery({
    queryKey: ["admin-present-perfect-questions"],
    queryFn: adminApi.listPresentPerfectQuestions,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-present-perfect-attempts", "practice"],
    queryFn: () => adminApi.listPresentPerfectAttempts("practice"),
  });
  const [notice, setNotice] = useState("");

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.togglePresentPerfectQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-present-perfect-questions"],
      }),
  });

  const togglePractice = async () => {
    if (!config) return;
    await adminApi.updatePresentPerfectConfig({
      practice_enabled: !config.practice_enabled,
    });
    setNotice(
      !config.practice_enabled
        ? "Present Perfect Practice habilitada globalmente."
        : "Present Perfect Practice deshabilitada.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-present-perfect-config"] });
  };

  return (
    <AppShell title="Present Perfect Practice" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/practice" label="← Práctica" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.practice_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void togglePractice()}
          >
            {config?.practice_enabled
              ? "Práctica habilitada"
              : "Práctica deshabilitada"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-sky/30 bg-white shadow-sm">
          <div className="border-b border-brand-sky/20 bg-gradient-to-r from-brand-sky to-brand-primary px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración de la práctica</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Entrenamiento con feedback. No usa nota mínima ni temporizador.
            </p>
          </div>
          <div className="space-y-3 p-6">
            <p className="text-sm text-gray-600">
              Banco compartido con el examen: {config?.question_bank_size ?? "—"}{" "}
              preguntas · Cada sesión toma {config?.question_count ?? 20}. Sin
              cupo de intentos; también se habilita por estudiante en Usuarios.
            </p>
            <p className="text-sm text-gray-600">
              La nota mínima y el temporizador del examen oficial se configuran en{" "}
              <Link
                to="/admin/exams/present-perfect"
                className="font-semibold text-brand-primary underline"
              >
                Present Perfect Exam
              </Link>
              .
            </p>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <PresentPerfectQuestionsSection
          questions={questionsQuery.data?.items}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
          error={questionsQuery.error}
          onToggle={(id, active) => toggleQuestion.mutate({ id, active })}
        />

        <ModuleReportsSection
          title="Reportes de Present Perfect Practice"
          description="Sesiones de práctica. Entra al reporte específico de cada sesión."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/practice/present-perfect/reports/${id}`}
          emptyMessage="Aún no hay sesiones de práctica."
        />
      </div>
    </AppShell>
  );
}

/** Listening Practice: habilitación + banco de preguntas. */
export function AdminListeningPracticePage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-listening-config"],
    queryFn: adminApi.getListeningConfig,
  });
  const questionsQuery = useQuery({
    queryKey: ["admin-listening-questions", "practice"],
    queryFn: () => adminApi.listListeningQuestions("practice"),
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-listening-attempts", "practice"],
    queryFn: () => adminApi.listListeningAttempts("practice"),
  });
  const [notice, setNotice] = useState("");

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.toggleListeningQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-listening-questions", "practice"],
      }),
  });

  const togglePractice = async () => {
    if (!config) return;
    await adminApi.updateListeningConfig({
      practice_enabled: !config.practice_enabled,
    });
    setNotice(
      !config.practice_enabled
        ? "Listening Practice habilitada globalmente."
        : "Listening Practice deshabilitada.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-listening-config"] });
  };

  return (
    <AppShell title="Listening Practice" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/practice" label="← Práctica" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.practice_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void togglePractice()}
          >
            {config?.practice_enabled
              ? "Práctica habilitada"
              : "Práctica deshabilitada"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-sky/30 bg-white shadow-sm">
          <div className="border-b border-brand-sky/20 bg-gradient-to-r from-brand-sky to-brand-primary px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración de la práctica</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Comprensión auditiva con feedback. Sin cupo de intentos.
            </p>
          </div>
          <div className="space-y-3 p-6">
            <p className="text-sm text-gray-600">
              Varios clips de audio. Banco total: {config?.question_bank_size ?? "—"}{" "}
              preguntas · Cada clip usa sus propias preguntas. También se habilita
              por estudiante en Usuarios.
            </p>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <PastSimpleQuestionsSection
          questions={questionsQuery.data?.items}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
          error={questionsQuery.error}
          onToggle={(id, active) => toggleQuestion.mutate({ id, active })}
        />

        <ModuleReportsSection
          title="Reportes de Listening Practice"
          description="Sesiones de práctica. Entra al reporte específico de cada sesión."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/practice/listening/reports/${id}`}
          emptyMessage="Aún no hay sesiones de práctica."
        />
      </div>
    </AppShell>
  );
}

/** Listening Exam: habilitación, temporizador y banco de Emma, Marcus y Ryan. */
export function AdminListeningExamPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-listening-config"],
    queryFn: adminApi.getListeningConfig,
  });
  const questionsQuery = useQuery({
    queryKey: ["admin-listening-questions", "exam"],
    queryFn: () => adminApi.listListeningQuestions("exam"),
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-listening-attempts", "exam"],
    queryFn: () => adminApi.listListeningAttempts("exam"),
  });
  const [passing, setPassing] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!config) return;
    setPassing(config.passing_percentage);
    setDuration(config.duration_minutes ?? "");
  }, [config]);

  const toggleQuestion = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.toggleListeningQuestion(id, active),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-listening-questions", "exam"],
      }),
  });

  const saveSettings = async () => {
    await adminApi.updateListeningConfig({
      passing_percentage:
        passing === "" ? config?.passing_percentage : Number(passing),
      duration_minutes: duration === "" ? null : Number(duration),
    });
    setNotice("Configuración de Listening Exam guardada.");
    void queryClient.invalidateQueries({ queryKey: ["admin-listening-config"] });
  };

  const toggleExam = async () => {
    if (!config) return;
    await adminApi.updateListeningConfig({ is_enabled: !config.is_enabled });
    setNotice(
      !config.is_enabled
        ? "Listening Exam habilitado globalmente."
        : "Listening Exam deshabilitado.",
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-listening-config"] });
  };

  return (
    <AppShell title="Listening Exam" nav={adminNav} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink to="/admin/exams" label="← Exámenes" />
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              config?.is_enabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
            disabled={!config}
            onClick={() => void toggleExam()}
          >
            {config?.is_enabled ? "Examen habilitado" : "Examen deshabilitado"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
          <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
            <h2 className="font-semibold">Configuración del examen</h2>
            <p className="mt-1 text-sm text-brand-white/90">
              Nota mínima y temporizador de Listening Exam (Emma, Marcus y Ryan).
            </p>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Banco: {config?.exam_question_bank_size ?? "—"} preguntas ·{" "}
              {config?.exam_clip_count ?? 3} examenes. Cada audio usa todas sus
              preguntas. La práctica se gestiona en el módulo Práctica.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Nota mínima (%)
                <input
                  type="number"
                  value={passing}
                  onChange={(e) => setPassing(Number(e.target.value))}
                  className="admin-search mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Temporizador (minutos, vacío = sin límite)
                <input
                  type="number"
                  value={duration}
                  onChange={(e) =>
                    setDuration(e.target.value ? Number(e.target.value) : "")
                  }
                  className="admin-search mt-1"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!config}
              onClick={() => void saveSettings()}
            >
              Guardar configuración
            </button>
            {notice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}
          </div>
        </section>

        <PastSimpleQuestionsSection
          questions={questionsQuery.data?.items}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
          error={questionsQuery.error}
          onToggle={(id, active) => toggleQuestion.mutate({ id, active })}
        />

        <ModuleReportsSection
          title="Reportes de Listening Exam"
          description="Intentos del examen oficial. Entra al reporte específico de cada evaluación."
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          items={reportsQuery.data?.items ?? []}
          detailPath={(id) => `/admin/exams/listening/reports/${id}`}
          emptyMessage="Aún no hay intentos de Listening Exam."
        />
      </div>
    </AppShell>
  );
}

function PresentPerfectQuestionsSection({
  questions,
  isLoading,
  isError,
  error,
  onToggle,
}: {
  questions?: {
    id: string;
    topic: string;
    question_type: string;
    question: string;
    correct_answer: string;
    active: boolean;
  }[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onToggle: (id: string, active: boolean) => void;
}) {
  const count = questions?.length ?? 0;

  return (
    <details className="admin-collapsible">
      <summary>
        <div>
          <h2 className="text-xl font-semibold">Banco de preguntas</h2>
          <p className="mt-1 text-sm text-gray-600">
            {count
              ? `${count} pregunta(s). Despliega para consultar o activar/desactivar ítems.`
              : "Despliega para consultar o activar/desactivar ítems del banco."}
          </p>
        </div>
        <span className="admin-collapsible-chevron" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="admin-collapsible-body">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!questions?.length}
          emptyMessage="No hay preguntas cargadas."
        >
          <div className="admin-table-wrap">
            <table className="admin-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Tema</th>
                  <th>Tipo</th>
                  <th>Pregunta</th>
                  <th>Respuesta</th>
                  <th>Activa</th>
                </tr>
              </thead>
              <tbody>
                {questions?.map((question) => (
                  <tr key={question.id}>
                    <td>{TOPIC_LABELS[question.topic] ?? question.topic}</td>
                    <td>{question.question_type}</td>
                    <td className="max-w-sm">{question.question}</td>
                    <td className="max-w-xs">{question.correct_answer}</td>
                    <td>
                      <button
                        type="button"
                        className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${
                          question.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        onClick={() => onToggle(question.id, !question.active)}
                      >
                        {question.active ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>
    </details>
  );
}
