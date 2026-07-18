import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { ApiError } from "../../lib/api";
import { adminApi } from "../../lib/endpoints";
import type { AdminUser } from "../../lib/types";

type CredentialModal = {
  type: "created" | "reset" | "updated";
  username: string;
  password?: string;
  mustChangePassword?: boolean;
} | null;

type EditModal = {
  user: AdminUser;
  username: string;
  full_name: string;
  password: string;
  is_active: boolean;
} | null;

type ResetModal = {
  user: AdminUser;
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

function formatApiError(err: unknown) {
  if (err instanceof ApiError) {
    const fields = Object.values(err.fieldErrors).flat();
    return fields.length ? fields.join(". ") : err.message;
  }
  return "No se pudo completar la acción.";
}

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [createForm, setCreateForm] = useState({
    username: "",
    full_name: "",
    password: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<EditModal>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<ResetModal>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [credentialModal, setCredentialModal] = useState<CredentialModal>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => adminApi.listUsers({ search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        username: createForm.username.trim(),
        full_name: createForm.full_name.trim(),
        role: "STUDENT",
        ...(createForm.password.trim() ? { password: createForm.password.trim() } : {}),
      }),
    onSuccess: (res) => {
      setCreateError(null);
      setActionNotice(null);
      setCreateForm({ username: "", full_name: "", password: "" });
      setCredentialModal({
        type: "created",
        username: res.user.username,
        password: res.temporary_password,
        mustChangePassword: res.user.must_change_password,
      });
      setCopied(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setCreateError(formatApiError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: EditModal) =>
      adminApi.updateUser(payload!.user.id, {
        username: payload!.username.trim(),
        full_name: payload!.full_name.trim(),
        is_active: payload!.is_active,
        ...(payload!.password.trim() ? { password: payload!.password.trim() } : {}),
      }),
    onSuccess: (user, payload) => {
      setEditError(null);
      setEditModal(null);
      setActionNotice(`Usuario «${user.username}» actualizado.`);
      if (payload?.password.trim()) {
        setCredentialModal({
          type: "updated",
          username: user.username,
          password: payload.password.trim(),
          mustChangePassword: user.must_change_password,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setEditError(formatApiError(err)),
  });

  const resetMutation = useMutation({
    mutationFn: (payload: { user: AdminUser; password?: string }) =>
      adminApi.resetPassword(
        payload.user.id,
        payload.password?.trim() ? payload.password.trim() : undefined,
      ),
    onSuccess: (res, payload) => {
      setResetError(null);
      setResetModal(null);
      const customPassword = Boolean(payload.password?.trim());
      setCredentialModal({
        type: "reset",
        username: payload.user.username,
        password: res.temporary_password,
        mustChangePassword: !customPassword,
      });
      setCopied(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setResetError(formatApiError(err)),
  });

  const allowAttemptMutation = useMutation({
    mutationFn: (userId: string) => adminApi.allowNewAttempt(userId),
    onSuccess: () => {
      setActionNotice("Nuevo intento habilitado para el estudiante.");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const handleCopyPassword = async () => {
    if (!credentialModal?.password) return;
    const ok = await copyText(credentialModal.password);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setEditError(null);
    setEditModal({
      user,
      username: user.username,
      full_name: user.full_name,
      password: "",
      is_active: user.is_active,
    });
  };

  const openResetModal = (user: AdminUser) => {
    setResetError(null);
    setResetModal({ user, password: "" });
  };

  return (
    <AppShell title="Usuarios" nav={adminNav}>
      {credentialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-lg space-y-4" role="dialog" aria-labelledby="cred-title">
            <h2 id="cred-title" className="text-lg font-bold text-brand-primary">
              {credentialModal.type === "created"
                ? "Estudiante creado"
                : credentialModal.type === "reset"
                  ? "Contraseña restablecida"
                  : "Contraseña actualizada"}
            </h2>
            <p className="text-sm text-gray-600">
              {credentialModal.mustChangePassword
                ? "El estudiante deberá cambiar esta contraseña al primer ingreso."
                : "El estudiante puede usar esta contraseña directamente."}
            </p>
            <div className="rounded-xl border border-brand-yellow bg-brand-yellow/20 p-4 space-y-2">
              <p>
                <span className="font-medium">Usuario:</span>{" "}
                <strong>{credentialModal.username}</strong>
              </p>
              {credentialModal.password && (
                <p>
                  <span className="font-medium">Contraseña:</span>{" "}
                  <strong className="font-mono text-lg">{credentialModal.password}</strong>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {credentialModal.password && (
                <button type="button" className="btn-primary" onClick={() => void handleCopyPassword()}>
                  {copied ? "Copiada" : "Copiar contraseña"}
                </button>
              )}
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

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="card max-w-lg w-full space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate(editModal);
            }}
          >
            <h2 className="text-lg font-bold">Editar usuario</h2>
            {editError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{editError}</p>
            )}
            <label className="block text-sm">
              Usuario
              <input
                value={editModal.username}
                onChange={(e) => setEditModal({ ...editModal, username: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm">
              Nombre completo
              <input
                value={editModal.full_name}
                onChange={(e) => setEditModal({ ...editModal, full_name: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm">
              Nueva contraseña (opcional, mínimo 8 caracteres)
              <input
                type="password"
                value={editModal.password}
                onChange={(e) => setEditModal({ ...editModal, password: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                minLength={8}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editModal.is_active}
                onChange={(e) => setEditModal({ ...editModal, is_active: e.target.checked })}
              />
              Cuenta activa
            </label>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                Guardar cambios
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border px-4"
                onClick={() => setEditModal(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="card max-w-lg w-full space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              resetMutation.mutate({
                user: resetModal.user,
                password: resetModal.password.trim() || undefined,
              });
            }}
          >
            <h2 className="text-lg font-bold">Restablecer contraseña</h2>
            <p className="text-sm text-gray-600">
              Usuario: <strong>{resetModal.user.username}</strong>
            </p>
            {resetError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{resetError}</p>
            )}
            <label className="block text-sm">
              Nueva contraseña (opcional, mínimo 8 caracteres)
              <input
                type="password"
                value={resetModal.password}
                onChange={(e) => setResetModal({ ...resetModal, password: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                minLength={8}
                placeholder="Déjala vacía para generar una automática"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={resetMutation.isPending}>
                {resetModal.password.trim() ? "Asignar contraseña" : "Generar automática"}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border px-4"
                onClick={() => setResetModal(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="card mb-6 space-y-3">
        <h2 className="font-semibold">Crear estudiante</h2>
        <p className="text-sm text-gray-600">
          Puedes definir usuario, nombre y contraseña. Si dejas la contraseña vacía, se generará una
          temporal automáticamente.
        </p>
        {createError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{createError}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Usuario"
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
            className="rounded-xl border px-3 py-2"
            minLength={2}
            required
          />
          <input
            placeholder="Nombre completo"
            value={createForm.full_name}
            onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
            className="rounded-xl border px-3 py-2"
            minLength={2}
            required
          />
          <input
            type="password"
            placeholder="Contraseña (opcional, mín. 8)"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            className="rounded-xl border px-3 py-2 sm:col-span-2"
            minLength={8}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={createMutation.isPending}
          onClick={() => {
            if (createForm.password.trim() && createForm.password.trim().length < 8) {
              setCreateError("La contraseña debe tener al menos 8 caracteres.");
              return;
            }
            createMutation.mutate();
          }}
        >
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

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data?.items.length}
        emptyMessage="No hay usuarios registrados."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
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
                      onClick={() => openEditModal(u)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="mr-2 text-brand-primary underline"
                      onClick={() => openResetModal(u)}
                    >
                      Restablecer clave
                    </button>
                    {u.role === "STUDENT" && (
                      <>
                        <Link
                          to={`/admin/students/${u.id}/report`}
                          className="mr-2 text-brand-primary underline"
                        >
                          Ver reporte
                        </Link>
                        <button
                          type="button"
                          className="text-brand-primary underline"
                          onClick={() => allowAttemptMutation.mutate(u.id)}
                        >
                          Nuevo intento
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </AppShell>
  );
}
