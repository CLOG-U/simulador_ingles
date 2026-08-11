import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { adminApi } from "../../lib/endpoints";
import type { AdminUser, StudyGroup } from "../../lib/types";

async function loadStaffUsers(): Promise<AdminUser[]> {
  const [admins, supers] = await Promise.all([
    adminApi.listUsers({ role: "ADMIN", page: 1 }),
    adminApi.listUsers({ role: "SUPERADMIN", page: 1 }),
  ]);
  const byId = new Map<string, AdminUser>();
  for (const u of [...admins.items, ...supers.items]) byId.set(u.id, u);
  return [...byId.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function AdminGroupsPage() {
  const [items, setItems] = useState<StudyGroup[]>([]);
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const [groups, staff] = await Promise.all([adminApi.listGroups(), loadStaffUsers()]);
      setItems(groups.items);
      setTeachers(staff);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        teacher_id: teacherId || null,
      });
      setName("");
      setDescription("");
      setTeacherId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Grupos" nav={adminNav} wide>
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-brand-primary">Clases / Grupos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Organiza estudiantes por clase. El acceso a exámenes sigue gestionándose por alumno.
          </p>
        </section>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <section className="card space-y-4">
          <h3 className="font-semibold text-brand-primary">Crear grupo</h3>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onCreate}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nombre</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                placeholder="A1 Mañana"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Profesor (opcional)</span>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Descripción</span>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
                {busy ? "Creando…" : "Crear grupo"}
              </button>
            </div>
          </form>
        </section>

        <section className="card overflow-x-auto">
          <h3 className="mb-3 font-semibold text-brand-primary">Listado ({items.length})</h3>
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-3 font-medium">Nombre</th>
                <th className="py-2 pr-3 font-medium">Profesor</th>
                <th className="py-2 pr-3 font-medium">Miembros</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr key={g.id} className="border-b border-gray-100">
                  <td className="py-3 pr-3">
                    <strong>{g.name}</strong>
                    {g.description ? (
                      <div className="text-xs text-gray-500">{g.description}</div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3">{g.teacher_name || "—"}</td>
                  <td className="py-3 pr-3">{g.member_count}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        g.is_active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {g.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3">
                    <Link to={`/admin/groups/${g.id}`} className="btn-admin-secondary text-xs">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-gray-500">
                    Aún no hay grupos. Crea el primero arriba.
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
