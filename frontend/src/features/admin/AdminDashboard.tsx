import { useQuery } from "@tanstack/react-query";
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
    </AppShell>
  );
}
