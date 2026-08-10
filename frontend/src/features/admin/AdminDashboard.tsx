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
            ].map(([label, value]) => (
              <div key={label as string} className="card">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-brand-primary">{value}</p>
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </AppShell>
  );
}
