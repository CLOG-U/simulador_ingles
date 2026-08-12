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
  const pastConfig = useQuery({
    queryKey: ["admin-past-simple-config"],
    queryFn: adminApi.getPastSimpleConfig,
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
        </div>
      </div>
    </AppShell>
  );
}

/** Hub: listado de prácticas. */
export function AdminPracticeHubPage() {
  const pastConfig = useQuery({
    queryKey: ["admin-past-simple-config"],
    queryFn: adminApi.getPastSimpleConfig,
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
