import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { examApi } from "../../lib/endpoints";
import { useAuth } from "../auth/AuthProvider";

export function StudentDashboard() {
  const { user } = useAuth();
  const { data: config } = useQuery({ queryKey: ["exam-config"], queryFn: examApi.config });
  const { data: current } = useQuery({
    queryKey: ["attempt-current"],
    queryFn: examApi.currentAttempt,
  });

  return (
    <AppShell title="Panel del estudiante">
      <div className="space-y-6">
        <section className="card">
          <h2 className="text-lg font-semibold">Hola, {user?.full_name}</h2>
          <p className="mt-2 text-gray-600">
            Evaluación de {config?.question_count ?? 20} verbos. Nota mínima:{" "}
            {config?.passing_percentage ?? 70}%.
          </p>
          {current ? (
            <Link to={`/student/exam/${current.id}`} className="btn-primary mt-4 inline-flex">
              Reanudar evaluación
            </Link>
          ) : (
            <Link to="/student/instructions" className="btn-primary mt-4 inline-flex">
              Iniciar evaluación
            </Link>
          )}
        </section>
      </div>
    </AppShell>
  );
}
