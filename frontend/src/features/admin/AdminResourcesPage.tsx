import { FormEvent, useEffect, useState } from "react";
import { AppShell, adminNav } from "../../components/AppShell";
import { adminApi } from "../../lib/endpoints";
import type { LearningResource, ResourceType, StudyGroup } from "../../lib/types";

const TYPE_LABELS: Record<ResourceType, string> = {
  pdf: "PDF",
  link: "Enlace",
  video: "Video",
};

export function AdminResourcesPage() {
  const [items, setItems] = useState<LearningResource[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("link");
  const [url, setUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [groupIds, setGroupIds] = useState<string[]>([]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setResourceType("link");
    setUrl("");
    setIsActive(true);
    setGroupIds([]);
  }

  async function load() {
    setError("");
    try {
      const [resources, groupList] = await Promise.all([
        adminApi.listResources(),
        adminApi.listGroups(),
      ]);
      setItems(resources.items);
      setGroups(groupList.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(resource: LearningResource) {
    setEditingId(resource.id);
    setTitle(resource.title);
    setDescription(resource.description || "");
    setResourceType(resource.resource_type);
    setUrl(resource.url);
    setIsActive(resource.is_active);
    setGroupIds(resource.group_ids);
  }

  function toggleGroup(id: string) {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      resource_type: resourceType,
      url: url.trim(),
      is_active: isActive,
      group_ids: groupIds,
    };
    try {
      if (editingId) {
        await adminApi.updateResource(editingId, {
          ...payload,
          description: description.trim() || null,
        });
      } else {
        await adminApi.createResource(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(resource: LearningResource) {
    if (!window.confirm(`¿Eliminar el recurso “${resource.title}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await adminApi.deleteResource(resource.id);
      if (editingId === resource.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Recursos" nav={adminNav} wide>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-brand-primary">Recursos de estudio</h2>
          <p className="mt-1 text-sm text-gray-600">
            PDF, enlaces o videos externos (solo URL). Asígnalos a uno o más grupos.
          </p>
        </section>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-brand-primary">
              {editingId ? "Editar recurso" : "Nuevo recurso"}
            </h3>
            {editingId ? (
              <button type="button" className="btn-admin-muted text-xs" onClick={resetForm}>
                Cancelar edición
              </button>
            ) : null}
          </div>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Título</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Tipo</span>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as ResourceType)}
              >
                <option value="pdf">PDF</option>
                <option value="link">Enlace</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">URL (http/https)</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://…"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Descripción</span>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={2000}
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Recurso activo
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">Asignar a grupos</legend>
              {groups.length ? (
                <div className="flex flex-wrap gap-3">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={groupIds.includes(g.id)}
                        onChange={() => toggleGroup(g.id)}
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Crea un grupo primero para poder asignar recursos.
                </p>
              )}
            </fieldset>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={busy || !title.trim() || !url.trim()}>
                {busy ? "Guardando…" : editingId ? "Guardar cambios" : "Crear recurso"}
              </button>
            </div>
          </form>
        </section>

        <section className="card overflow-x-auto">
          <h3 className="mb-3 font-semibold text-brand-primary">Listado ({items.length})</h3>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-3 font-medium">Título</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Grupos</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-3 pr-3">
                    <strong>{r.title}</strong>
                    <div className="mt-1 truncate text-xs text-brand-sky">
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        {r.url}
                      </a>
                    </div>
                  </td>
                  <td className="py-3 pr-3">{TYPE_LABELS[r.resource_type]}</td>
                  <td className="py-3 pr-3">
                    {r.group_names.length ? r.group_names.join(", ") : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.is_active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {r.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-admin-secondary text-xs"
                        onClick={() => startEdit(r)}
                        disabled={busy}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-admin-danger text-xs"
                        onClick={() => void onDelete(r)}
                        disabled={busy}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-gray-500">
                    Aún no hay recursos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
