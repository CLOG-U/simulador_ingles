import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, adminNav } from "../../components/AppShell";
import { adminApi } from "../../lib/endpoints";

type CredentialModal = {
  type: "created" | "reset";
  username: string;
  password: string;
} | null;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [credentialModal, setCredentialModal] = useState<CredentialModal>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      setActionNotice(null);
      setCredentialModal({
        type: "created",
        username: res.user.username,
        password: res.temporary_password,
      });
      setCopied(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: (user: { id: string; username: string }) => adminApi.resetPassword(user.id),
    onSuccess: (res, user) => {
      setActionNotice(null);
      setCredentialModal({
        type: "reset",
        username: user.username,
        password: res.temporary_password,
      });
      setCopied(false);
    },
  });

  const allowAttemptMutation = useMutation({
    mutationFn: (userId: string) => adminApi.allowNewAttempt(userId),
    onSuccess: () => {
      setActionNotice("Nuevo intento habilitado para el estudiante.");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const handleCopyPassword = async () => {
    if (!credentialModal) return;
    const ok = await copyText(credentialModal.password);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppShell title="Usuarios" nav={adminNav}>
      {credentialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-lg space-y-4" role="dialog" aria-labelledby="cred-title">
            <h2 id="cred-title" className="text-lg font-bold text-brand-primary">
              {credentialModal.type === "created"
                ? "Estudiante creado"
                : "Contraseña restablecida"}
            </h2>
            <p className="text-sm text-gray-600">
              {credentialModal.type === "created"
                ? "Comparte estas credenciales con el estudiante. Deberá cambiar la contraseña al primer ingreso."
                : "El estudiante debe usar esta contraseña temporal y cambiarla al iniciar sesión."}
            </p>
            <div className="rounded-xl border border-brand-yellow bg-brand-yellow/20 p-4 space-y-2">
              <p>
                <span className="font-medium">Usuario:</span>{" "}
                <strong>{credentialModal.username}</strong>
              </p>
              <p>
                <span className="font-medium">Contraseña temporal:</span>{" "}
                <strong className="font-mono text-lg">{credentialModal.password}</strong>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-primary" onClick={() => void handleCopyPassword()}>
                {copied ? "Copiada" : "Copiar contraseña"}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border px-4"
                onClick={() => setCredentialModal(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="card mb-6 space-y-3">
        <h2 className="font-semibold">Crear estudiante</h2>
        <p className="text-sm text-gray-600">
          Al crear la cuenta se mostrará la contraseña temporal en un cuadro de diálogo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input id="new-username" placeholder="Usuario" className="rounded-xl border px-3 py-2" />
          <input id="new-fullname" placeholder="Nombre completo" className="rounded-xl border px-3 py-2" />
        </div>
        <button type="button" className="btn-primary" onClick={() => createMutation.mutate()}>
          Crear cuenta
        </button>
        {actionNotice && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">{actionNotice}</p>
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Usuario</th>
                <th className="py-2">Nombre</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Intentos</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2">{u.username}</td>
                  <td className="py-2">{u.full_name}</td>
                  <td className="py-2">
                    {u.is_active ? "Activo" : "Inactivo"}
                    {u.must_change_password && (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        Debe cambiar clave
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    {u.role === "STUDENT" ? (
                      <span>
                        {u.attempts_remaining ?? "—"} restante(s)
                        <span className="block text-xs text-gray-500">
                          {u.attempts_used ?? 0} de {u.attempts_max ?? "—"} usados
                          {u.has_open_attempt ? " · examen en curso" : ""}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="mr-2 text-brand-primary underline"
                      onClick={() => resetMutation.mutate({ id: u.id, username: u.username })}
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
