import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { adminApi } from "../../lib/endpoints";

export function AdminDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: adminApi.dashboard,
  });

  const mauCurrent = data?.monthly_active_students_current ?? 0;
  const mauHistory = data?.monthly_active_students ?? [];
  const groups = data?.groups ?? [];

  return (
    <AppShell title="Panel del profesor" nav={adminNav}>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <Link
            to="/admin/exams"
            className="card border border-brand-primary/15 bg-gradient-to-br from-brand-primary/[0.06] to-white transition-transform hover:scale-[1.01]"
          >
            <h2 className="text-lg font-semibold text-brand-primary">Exámenes</h2>
            <p className="mt-1 text-sm text-gray-600">
              Verb Exam y Past Simple Exam: nota mínima, temporizador y banco de
              preguntas.
            </p>
          </Link>
          <Link
            to="/admin/practice"
            className="card border border-brand-sky/30 bg-gradient-to-br from-brand-sky/10 to-white transition-transform hover:scale-[1.01]"
          >
            <h2 className="text-lg font-semibold text-brand-primary-dark">
              Práctica
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Past Simple Practice: habilitación global y consulta del banco.
            </p>
          </Link>
        </section>

        <QueryState isLoading={isLoading} isError={isError} error={error}>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Estudiantes activos", data?.active_students],
                ["Verb: terminados", data?.finished_attempts],
                ["Verb: promedio", data?.average_percentage?.toFixed(1) ?? "—"],
                ["Verb: aprobados", data?.passed_count],
                ["Past Simple: terminados", data?.past_simple_finished_attempts],
                [
                  "Past Simple: promedio",
                  data?.past_simple_average_percentage?.toFixed(1) ?? "—",
                ],
                ["Past Simple: aprobados", data?.past_simple_passed_count],
                ["Estudiantes activos (mes actual)", mauCurrent],
              ].map(([label, value]) => (
                <div key={label as string} className="card">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-brand-primary">{value}</p>
                </div>
              ))}
            </div>

            <section className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-brand-primary">Por clase</h2>
                <Link to="/admin/groups" className="text-sm font-medium text-brand-sky hover:underline">
                  Ver grupos
                </Link>
              </div>
              {groups.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="py-2 pr-3 font-medium">Grupo</th>
                        <th className="py-2 pr-3 font-medium">Miembros</th>
                        <th className="py-2 pr-3 font-medium">Verb %</th>
                        <th className="py-2 pr-3 font-medium">Past Simple %</th>
                        <th className="py-2 pr-3 font-medium">Alertas</th>
                        <th className="py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <tr key={g.group_id} className="border-b border-gray-100">
                          <td className="py-3 pr-3 font-medium">{g.group_name}</td>
                          <td className="py-3 pr-3">{g.member_count}</td>
                          <td className="py-3 pr-3">
                            {g.verb_average_percentage?.toFixed(1) ?? "—"}
                          </td>
                          <td className="py-3 pr-3">
                            {g.past_simple_average_percentage?.toFixed(1) ?? "—"}
                          </td>
                          <td className="py-3 pr-3">{g.alert_count}</td>
                          <td className="py-3">
                            <Link
                              to={`/admin/groups/${g.group_id}`}
                              className="text-brand-primary hover:underline"
                            >
                              Detalle
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Aún no hay grupos.{" "}
                  <Link to="/admin/groups" className="text-brand-primary hover:underline">
                    Crear el primero
                  </Link>
                </p>
              )}
            </section>

            <section className="card space-y-3">
              <h2 className="text-lg font-semibold text-brand-primary">
                Estudiantes activos (MAU)
              </h2>
              <p className="text-sm text-gray-600">
                Estudiantes con login o intento/práctica iniciado en el mes. Solo rol STUDENT.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[20rem] text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2 pr-3 font-medium">Mes</th>
                      <th className="py-2 font-medium">Activos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mauHistory.map((row) => (
                      <tr key={row.year_month} className="border-b border-gray-100">
                        <td className="py-2 pr-3">{row.year_month}</td>
                        <td className="py-2 font-semibold text-brand-primary">{row.count}</td>
                      </tr>
                    ))}
                    {!mauHistory.length ? (
                      <tr>
                        <td colSpan={2} className="py-4 text-gray-500">
                          Sin historial aún.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </QueryState>
      </div>
    </AppShell>
  );
}
