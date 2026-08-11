import { useQuery } from "@tanstack/react-query";
import { AppShell, studentNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { studentApi } from "../../lib/endpoints";
import type { LearningResource, ResourceType } from "../../lib/types";

const TYPE_LABELS: Record<ResourceType, string> = {
  pdf: "PDF",
  link: "Enlace",
  video: "Video",
};

function ResourceRow({ resource }: { resource: LearningResource }) {
  return (
    <article className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-brand-primary">{resource.title}</h3>
          <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold text-brand-primary">
            {TYPE_LABELS[resource.resource_type]}
          </span>
        </div>
        {resource.description ? (
          <p className="mt-1 text-sm text-gray-600">{resource.description}</p>
        ) : null}
        {resource.group_names.length ? (
          <p className="mt-1 text-xs text-gray-500">
            Clase: {resource.group_names.join(", ")}
          </p>
        ) : null}
      </div>
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary shrink-0"
      >
        Abrir recurso
      </a>
    </article>
  );
}

export function StudentResourcesPage() {
  const query = useQuery({
    queryKey: ["student-resources"],
    queryFn: studentApi.listResources,
  });

  return (
    <AppShell title="Recursos" nav={studentNav}>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold">Recursos</h2>
          <p className="mt-1 text-gray-600">
            Materiales compartidos por tu profesor para tus clases.
          </p>
        </section>
        <QueryState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
        >
          <div className="space-y-4">
            {(query.data?.items || []).map((r) => (
              <ResourceRow key={r.id} resource={r} />
            ))}
            {!query.data?.items.length ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
                Todavía no hay recursos asignados a tus grupos.
              </p>
            ) : null}
          </div>
        </QueryState>
      </div>
    </AppShell>
  );
}
