import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, adminNav } from "../../components/AppShell";
import { adminApi } from "../../lib/endpoints";

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => adminApi.listUsers({ search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        username: (document.getElementById("new-username") as HTMLInputElement).value,
        full_name: (document.getElementById("new-fullname") as HTMLInputElement).value,
        role: "STUDENT",
      }),
    onSuccess: (res) => {
      setCreatedPassword(res.temporary_password);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => adminApi.resetPassword(userId),
    onSuccess: (res) => setCreatedPassword(res.temporary_password),
  });

  const allowAttemptMutation = useMutation({
    mutationFn: (userId: string) => adminApi.allowNewAttempt(userId),
    onSuccess: () => {
      setCreatedPassword("Nuevo intento habilitado para el estudiante.");
    },
  });

  return (
    <AppShell title="Usuarios" nav={adminNav}>
      <section className="card mb-6 space-y-3">
        <h2 className="font-semibold">Crear estudiante</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input id="new-username" placeholder="Usuario" className="rounded-xl border px-3 py-2" />
          <input id="new-fullname" placeholder="Nombre completo" className="rounded-xl border px-3 py-2" />
        </div>
        <button type="button" className="btn-primary" onClick={() => createMutation.mutate()}>
          Crear cuenta
        </button>
        {createdPassword && (
          <p className="rounded-lg bg-brand-yellow/30 px-3 py-2 text-sm">
            Contraseña temporal: <strong>{createdPassword}</strong>
          </p>
        )}
      </section>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar usuario…"
        className="mb-4 w-full rounded-xl border px-4 py-2"
      />

      {isLoading ? (
        <p>Cargando…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Usuario</th>
                <th className="py-2">Nombre</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2">{u.username}</td>
                  <td className="py-2">{u.full_name}</td>
                  <td className="py-2">{u.is_active ? "Activo" : "Inactivo"}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="mr-2 text-brand-primary underline"
                      onClick={() => resetMutation.mutate(u.id)}
                    >
                      Restablecer clave
                    </button>
                    {u.role === "STUDENT" && (
                      <button
                        type="button"
                        className="text-brand-primary underline"
                        onClick={() => allowAttemptMutation.mutate(u.id)}
                      >
                        Nuevo intento
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
