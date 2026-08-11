import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, adminNav } from "../../components/AppShell";
import { adminApi } from "../../lib/endpoints";
import type {
  AdminUser,
  GroupMetrics,
  StudyGroup,
  StudyGroupMember,
} from "../../lib/types";

async function loadStaffUsers(): Promise<AdminUser[]> {
  const [admins, supers] = await Promise.all([
    adminApi.listUsers({ role: "ADMIN", page: 1 }),
    adminApi.listUsers({ role: "SUPERADMIN", page: 1 }),
  ]);
  const byId = new Map<string, AdminUser>();
  for (const u of [...admins.items, ...supers.items]) byId.set(u.id, u);
  return [...byId.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
}

async function loadStudents(): Promise<AdminUser[]> {
  const first = await adminApi.listUsers({ role: "STUDENT", page: 1 });
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(first.total / pageSize));
  const pages = [first];
  for (let page = 2; page <= totalPages; page += 1) {
    pages.push(await adminApi.listUsers({ role: "STUDENT", page }));
  }
  return pages.flatMap((p) => p.items).sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function AdminGroupDetailPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [metrics, setMetrics] = useState<GroupMetrics | null>(null);
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!groupId) return;
    setError("");
    try {
      const [g, m, studs, staff] = await Promise.all([
        adminApi.getGroup(groupId),
        adminApi.groupMetrics(groupId),
        loadStudents(),
        loadStaffUsers(),
      ]);
      setGroup(g);
      setMetrics(m);
      setName(g.name);
      setDescription(g.description || "");
      setTeacherId(g.teacher_id || "");
      setIsActive(g.is_active);
      setStudents(studs);
      setTeachers(staff);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el grupo");
    }
  }

  useEffect(() => {
    void load();
  }, [groupId]);

  const memberIds = useMemo(
    () => new Set((group?.members || []).map((m) => m.user_id)),
    [group],
  );
  const availableStudents = useMemo(
    () => students.filter((s) => s.is_active && !memberIds.has(s.id)),
    [students, memberIds],
  );

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    setBusy(true);
    setError("");
    try {
      await adminApi.updateGroup(groupId, {
        name: name.trim(),
        description: description.trim() || null,
        teacher_id: teacherId || null,
        is_active: isActive,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function onAddMember(e: FormEvent) {
    e.preventDefault();
    if (!groupId || !selectedStudent) return;
    setBusy(true);
    setError("");
    try {
      await adminApi.addGroupMember(groupId, selectedStudent);
      setSelectedStudent("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveMember(member: StudyGroupMember) {
    if (!groupId) return;
    if (!window.confirm(`¿Quitar a ${member.full_name} del grupo?`)) return;
    setBusy(true);
    setError("");
    try {
      await adminApi.removeGroupMember(groupId, member.user_id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!groupId || !group) return;
    if (!window.confirm(`¿Eliminar el grupo “${group.name}”?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteGroup(groupId);
      navigate("/admin/groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
      setBusy(false);
    }
  }

  if (!group && !error) {
    return (
      <AppShell title="Grupo" nav={adminNav} wide>
        <p className="text-gray-600">Cargando grupo…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={group?.name || "Grupo"} nav={adminNav} wide>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">
              <Link to="/admin/groups" className="text-brand-primary hover:underline">
                Grupos
              </Link>{" "}
              / detalle
            </p>
            <h2 className="text-lg font-semibold text-brand-primary">{group?.name || "Grupo"}</h2>
            <p className="mt-1 text-sm text-gray-600">
              Edita datos, miembros y revisa métricas de la clase.
            </p>
          </div>
          <button
            type="button"
            className="btn-admin-danger"
            onClick={() => void onDelete()}
            disabled={busy}
          >
            Eliminar grupo
          </button>
        </header>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {metrics ? (
          <section className="card space-y-4">
            <h3 className="font-semibold text-brand-primary">Métricas de la clase</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-brand-primary/10 bg-brand-primary/[0.03] p-4">
                <p className="text-sm text-gray-500">Miembros activos</p>
                <p className="mt-1 text-2xl font-bold text-brand-primary">
                  {metrics.active_member_count}/{metrics.member_count}
                </p>
              </div>
              <div className="rounded-xl border border-brand-primary/10 bg-brand-primary/[0.03] p-4">
                <p className="text-sm text-gray-500">Intentos verbos</p>
                <p className="mt-1 text-2xl font-bold text-brand-primary">
                  {metrics.verb_finished}
                </p>
                <p className="text-xs text-gray-500">
                  Promedio {metrics.verb_average_percentage?.toFixed(1) ?? "—"}%
                </p>
              </div>
              <div className="rounded-xl border border-brand-sky/20 bg-brand-sky/5 p-4">
                <p className="text-sm text-gray-500">Intentos past simple</p>
                <p className="mt-1 text-2xl font-bold text-brand-primary-dark">
                  {metrics.past_simple_finished}
                </p>
                <p className="text-xs text-gray-500">
                  Promedio {metrics.past_simple_average_percentage?.toFixed(1) ?? "—"}%
                </p>
              </div>
            </div>
            {metrics.alerts.length ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Alertas</h4>
                <ul className="space-y-2 text-sm">
                  {metrics.alerts.map((a) => (
                    <li
                      key={a}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sin alertas por ahora.</p>
            )}
          </section>
        ) : null}

        <section className="card space-y-4">
          <h3 className="font-semibold text-brand-primary">Datos del grupo</h3>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSave}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nombre</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Profesor</span>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
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
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Grupo activo
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        <section className="card space-y-4">
          <h3 className="font-semibold text-brand-primary">
            Estudiantes ({group?.members?.length || 0})
          </h3>
          <form className="flex flex-wrap gap-2" onSubmit={onAddMember}>
            <select
              className="min-w-[16rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              required
            >
              <option value="">Elegir estudiante…</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.username})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-admin-primary"
              disabled={busy || !selectedStudent}
            >
              Asignar
            </button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 pr-3 font-medium">Nombre</th>
                  <th className="py-2 pr-3 font-medium">Usuario</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {(group?.members || []).map((m) => (
                  <tr key={m.user_id} className="border-b border-gray-100">
                    <td className="py-3 pr-3">{m.full_name}</td>
                    <td className="py-3 pr-3">{m.username}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          m.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {m.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        className="btn-admin-muted text-xs"
                        onClick={() => void onRemoveMember(m)}
                        disabled={busy}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                {!group?.members?.length ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-gray-500">
                      Sin miembros aún.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
