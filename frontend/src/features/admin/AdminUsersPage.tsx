import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, adminNav } from "../../components/AppShell";
import { QueryState } from "../../components/QueryState";
import { ApiError } from "../../lib/api";
import { adminApi } from "../../lib/endpoints";
import { roleLabel, type AdminUser, type ExamType } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";
import {
  applyAccessUpdatesToUsers,
  bulkAccessUpdates,
  enabledCountLabel,
  type AccessUpdate,
} from "./adminUserAccessCache";

type AdminUsersQueryData = { items: AdminUser[]; total: number };

function patchAdminUsersQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  updates: AccessUpdate[],
) {
  queryClient.setQueriesData<AdminUsersQueryData>(
    { queryKey: ["admin-users"] },
    (current) =>
      current
        ? {
            ...current,
            items: applyAccessUpdatesToUsers(current.items, userId, updates),
          }
        : current,
  );
}

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

function AccessStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`normal-case rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${
        enabled
          ? "bg-emerald-100 text-emerald-700"
          : "bg-rose-100 text-rose-700"
      }`}
    >
      {enabled ? "Hab." : "Bloq."}
    </span>
  );
}

function ActionGroup({
  title,
  children,
  enabled,
}: {
  title: string;
  children: ReactNode;
  enabled?: boolean;
}) {
  return (
    <details className="admin-panel group w-full min-w-[10.5rem] max-w-[14rem] shrink-0">
      <summary className="admin-panel-title mb-0 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">{title}</span>
          <span className="flex shrink-0 items-center gap-1">
            {enabled !== undefined ? (
              <AccessStatusBadge enabled={enabled} />
            ) : null}
            <span
              className="text-[10px] font-semibold text-brand-sky transition-transform group-open:rotate-180"
              aria-hidden
            >
              ▾
            </span>
          </span>
        </span>
      </summary>
      <div className="mt-2 grid animate-[fadeIn_180ms_ease-out] gap-2">{children}</div>
    </details>
  );
}

function AttemptInfo({
  title,
  children,
  enabled,
}: {
  title: string;
  children: ReactNode;
  enabled?: boolean;
}) {
  return (
    <details className="admin-panel group w-full min-w-[9.5rem] max-w-[13rem] shrink-0">
      <summary className="admin-panel-title mb-0 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">{title}</span>
          <span className="flex shrink-0 items-center gap-1">
            {enabled !== undefined ? (
              <AccessStatusBadge enabled={enabled} />
            ) : null}
            <span
              className="text-[10px] font-semibold text-brand-sky transition-transform group-open:rotate-180"
              aria-hidden
            >
              ▾
            </span>
          </span>
        </span>
      </summary>
      <div className="mt-2 space-y-1 text-xs text-gray-700">{children}</div>
    </details>
  );
}

function ModuleGroup({
  title,
  tone = "exam",
  children,
  badge,
}: {
  title: string;
  tone?: "exam" | "practice" | "account";
  children: ReactNode;
  badge?: string;
}) {
  const toneClass =
    tone === "practice"
      ? "admin-module-practice"
      : tone === "account"
        ? "admin-module-account"
        : "admin-module-exam";

  return (
    <details className={`admin-module group ${toneClass}`}>
      <summary className="admin-module-summary">
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">{title}</span>
          <span className="flex shrink-0 items-center gap-1">
            {badge ? (
              <span className="normal-case rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-current">
                {badge}
              </span>
            ) : null}
            <span
              className="text-[10px] font-semibold opacity-70 transition-transform group-open:rotate-180"
              aria-hidden
            >
              ▾
            </span>
          </span>
        </span>
      </summary>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </details>
  );
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [createForm, setCreateForm] = useState<{
    username: string;
    full_name: string;
    password: string;
    role: "STUDENT" | "ADMIN";
  }>({
    username: "",
    full_name: "",
    password: "",
    role: "STUDENT",
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
  const { data: onlineUsers } = useQuery({
    queryKey: ["admin-online-users"],
    queryFn: adminApi.onlineUsers,
    refetchInterval: 20_000,
  });
  const onlineIds = new Set(onlineUsers?.items.map((item) => item.id));

  const canCreateAdmins = currentUser?.role === "SUPERADMIN";

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        username: createForm.username.trim(),
        full_name: createForm.full_name.trim(),
        role: createForm.role,
        ...(createForm.password.trim() ? { password: createForm.password.trim() } : {}),
      }),
    onSuccess: (res) => {
      setCreateError(null);
      setActionNotice(null);
      setCreateForm({
        username: "",
        full_name: "",
        password: "",
        role: "STUDENT",
      });
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
    mutationFn: ({
      userId,
      examType,
      mode = "exam",
    }: {
      userId: string;
      examType: ExamType;
      mode?: "exam" | "practice";
    }) => adminApi.authorizeNewAttempt(userId, examType, mode),
    onSuccess: (result, variables) => {
      if (variables.mode === "practice") {
        setActionNotice("Nuevo intento de práctica habilitado.");
      } else {
        setActionNotice(
          `Intento acumulado: cupo total ${result.allowed_attempts} (${result.remaining_attempts} pendiente(s)).`,
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setActionNotice(formatApiError(err)),
  });
  const accessMutation = useMutation({
    mutationFn: ({
      userId,
      examType,
      isEnabled,
      practiceEnabled,
    }: {
      userId: string;
      examType: ExamType;
      isEnabled?: boolean;
      practiceEnabled?: boolean;
    }) =>
      adminApi.updateExamAccess(userId, examType, {
        ...(isEnabled !== undefined ? { is_enabled: isEnabled } : {}),
        ...(practiceEnabled !== undefined
          ? { practice_enabled: practiceEnabled }
          : {}),
      }),
    onMutate: async ({ userId, examType, isEnabled, practiceEnabled }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      patchAdminUsersQueries(queryClient, userId, [
        {
          exam_type: examType,
          ...(isEnabled !== undefined ? { is_enabled: isEnabled } : {}),
          ...(practiceEnabled !== undefined
            ? { practice_enabled: practiceEnabled }
            : {}),
        },
      ]);
    },
    onSuccess: (result, variables) => {
      setActionNotice("Acceso actualizado.");
      patchAdminUsersQueries(queryClient, variables.userId, [
        {
          exam_type: result.exam_type,
          is_enabled: result.is_enabled,
          practice_enabled: result.practice_enabled,
        },
      ]);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setActionNotice(formatApiError(err)),
  });
  const bulkAccessMutation = useMutation({
    mutationFn: ({
      userId,
      exams,
      practices,
    }: {
      userId: string;
      exams?: boolean;
      practices?: boolean;
    }) => adminApi.updateExamAccessBulk(userId, { exams, practices }),
    onMutate: async ({ userId, exams, practices }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      patchAdminUsersQueries(
        queryClient,
        userId,
        bulkAccessUpdates(exams, practices),
      );
    },
    onSuccess: (result, variables) => {
      if (variables.exams === true && variables.practices === true) {
        setActionNotice("Todos los exámenes y prácticas quedaron habilitados.");
      } else if (variables.exams === false && variables.practices === false) {
        setActionNotice("Todos los exámenes y prácticas quedaron bloqueados.");
      } else if (variables.exams === true) {
        setActionNotice("Todos los exámenes quedaron habilitados.");
      } else if (variables.exams === false) {
        setActionNotice("Todos los exámenes quedaron bloqueados.");
      } else if (variables.practices === true) {
        setActionNotice("Toda la práctica quedó habilitada.");
      } else {
        setActionNotice("Toda la práctica quedó bloqueada.");
      }
      patchAdminUsersQueries(
        queryClient,
        variables.userId,
        result.updated.map((item) => ({
          exam_type: item.exam_type,
          is_enabled: item.is_enabled,
          practice_enabled: item.practice_enabled,
        })),
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setActionNotice(formatApiError(err)),
  });
  const resetModuleMutation = useMutation({
    mutationFn: ({
      userId,
      examType,
      mode = "exam",
    }: {
      userId: string;
      examType: ExamType;
      mode?: "exam" | "practice";
    }) => adminApi.resetExamProgress(userId, examType, mode),
    onSuccess: (result) => {
      const moduleLabel =
        result.exam_type === "verb_exam"
          ? "Verb Exam"
          : result.exam_type === "verb_base_exam"
            ? "Verb Base Form"
            : result.exam_type === "verb_past_exam"
              ? result.mode === "practice"
                ? "Verb Past Form práctica"
                : "Verb Past Form"
            : result.exam_type === "present_simple_exam"
              ? "Present Simple examen"
              : result.exam_type === "present_perfect_exam"
                ? result.mode === "practice"
                  ? "Present Perfect práctica"
                  : "Present Perfect examen"
                : result.exam_type === "listening_practice"
                  ? result.mode === "practice"
                    ? "Listening práctica"
                    : "Listening examen"
                : result.mode === "practice"
                  ? "Past Simple práctica"
                  : "Past Simple examen";
      setActionNotice(
        `${moduleLabel} reiniciado (${result.deleted_attempts} intento(s) eliminados).`,
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setActionNotice(formatApiError(err)),
  });
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: (result) => {
      setActionNotice(`Usuario ${result.username} eliminado.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setActionNotice(formatApiError(err)),
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
    <AppShell title="Usuarios" nav={adminNav} wide>
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

      <section className="mb-6 overflow-hidden rounded-[var(--radius-card)] border border-brand-primary/10 bg-white shadow-sm">
        <div className="border-b border-brand-primary/10 bg-gradient-to-r from-brand-primary to-brand-sky px-6 py-4 text-brand-white">
          <h2 className="font-semibold">Crear usuario</h2>
          <p className="mt-1 text-sm text-brand-white/90">
            Elige el tipo de cuenta, luego define usuario, nombre y contraseña.
          </p>
        </div>
        <div className="space-y-3 p-6">
        <p className="text-sm text-gray-600">
          Si dejas la contraseña vacía, se generará una temporal automáticamente.
        </p>
        {createError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{createError}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-gray-700">Tipo de cuenta</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  createForm.role === "STUDENT"
                    ? "border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/30"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                onClick={() => setCreateForm({ ...createForm, role: "STUDENT" })}
              >
                <p className="text-sm font-semibold text-brand-primary">Estudiante</p>
                <p className="mt-1 text-xs text-gray-600">
                  Accede a exámenes y práctica. No ve el panel de administración.
                </p>
              </button>
              <button
                type="button"
                disabled={!canCreateAdmins}
                className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  createForm.role === "ADMIN"
                    ? "border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/30"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                onClick={() => {
                  if (!canCreateAdmins) return;
                  setCreateForm({ ...createForm, role: "ADMIN" });
                }}
              >
                <p className="text-sm font-semibold text-brand-primary">Administrador</p>
                <p className="mt-1 text-xs text-gray-600">
                  {canCreateAdmins
                    ? "Mismas funciones del panel (usuarios, exámenes, reportes). Solo el Superadmin puede crearlos."
                    : "Solo el Superadmin puede crear administradores."}
                </p>
              </button>
            </div>
          </fieldset>
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
            if (createForm.role === "ADMIN" && !canCreateAdmins) {
              setCreateError("Solo el Superadmin puede crear administradores.");
              return;
            }
            createMutation.mutate();
          }}
        >
          {createForm.role === "ADMIN"
            ? "Crear administrador"
            : "Crear estudiante"}
        </button>
        {actionNotice && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">{actionNotice}</p>
        )}
        </div>
      </section>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuario…"
          className="admin-search"
        />
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data?.items.length}
        emptyMessage="No hay usuarios registrados."
      >
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Intentos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-brand-primary-dark">{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        u.role === "SUPERADMIN"
                          ? "bg-brand-primary text-brand-white"
                          : u.role === "ADMIN"
                            ? "bg-brand-primary/15 text-brand-primary"
                            : "bg-brand-sky/20 text-brand-primary-dark"
                      }`}
                    >
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        u.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                    {(u.is_online || onlineIds.has(u.id)) && (
                      <span className="mt-1 flex w-fit items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        En línea
                      </span>
                    )}
                    {u.must_change_password && (
                      <span className="mt-1 block w-fit rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Debe cambiar clave
                      </span>
                    )}
                  </td>
                  <td>
                    {u.role === "STUDENT" ? (
                      (() => {
                        const verbAccess = u.exam_access?.find(
                          (item) => item.exam_type === "verb_exam",
                        );
                        const verbBaseAccess = u.exam_access?.find(
                          (item) => item.exam_type === "verb_base_exam",
                        );
                        const verbPastAccess = u.exam_access?.find(
                          (item) => item.exam_type === "verb_past_exam",
                        );
                        const pastAccess = u.exam_access?.find(
                          (item) => item.exam_type === "past_simple_exam",
                        );
                        const presentAccess = u.exam_access?.find(
                          (item) => item.exam_type === "present_simple_exam",
                        );
                        const perfectAccess = u.exam_access?.find(
                          (item) => item.exam_type === "present_perfect_exam",
                        );
                        const listeningAccess = u.exam_access?.find(
                          (item) => item.exam_type === "listening_practice",
                        );
                        const examEnabledFlags = [
                          verbAccess?.is_enabled,
                          verbBaseAccess?.is_enabled,
                          pastAccess?.is_enabled,
                          presentAccess?.is_enabled,
                          perfectAccess?.is_enabled,
                          listeningAccess?.is_enabled,
                        ];
                        const practiceEnabledFlags = [
                          verbBaseAccess?.practice_enabled,
                          verbPastAccess?.practice_enabled,
                          pastAccess?.practice_enabled,
                          presentAccess?.practice_enabled,
                          perfectAccess?.practice_enabled,
                          listeningAccess?.practice_enabled,
                        ];
                        return (
                          <div className="flex flex-wrap gap-2">
                            <ModuleGroup
                              title="Exámenes"
                              tone="exam"
                              badge={enabledCountLabel(examEnabledFlags)}
                            >
                              <AttemptInfo
                                title="Verb Exam"
                                enabled={Boolean(verbAccess?.is_enabled)}
                              >
                                <p>
                                  {verbAccess?.is_enabled
                                    ? "Habilitado"
                                    : "Bloqueado"}
                                </p>
                                <p>
                                  Cupo: {verbAccess?.allowed_attempts ?? 1}{" "}
                                  intento(s)
                                </p>
                                <p>
                                  {verbAccess?.submitted_attempts ?? 0}{" "}
                                  completado(s)
                                </p>
                                <p>
                                  {verbAccess?.remaining_attempts ??
                                    verbAccess?.allowed_attempts ??
                                    1}{" "}
                                  pendiente(s)
                                </p>
                              </AttemptInfo>
                              <AttemptInfo
                                title="Verb Base Form"
                                enabled={Boolean(verbBaseAccess?.is_enabled)}
                              >
                                <p>
                                  {verbBaseAccess?.is_enabled
                                    ? "Habilitado"
                                    : "Bloqueado"}
                                </p>
                                <p>
                                  Cupo: {verbBaseAccess?.allowed_attempts ?? 1}{" "}
                                  intento(s)
                                </p>
                                <p>
                                  {verbBaseAccess?.submitted_attempts ?? 0}{" "}
                                  completado(s)
                                </p>
                                <p>
                                  {verbBaseAccess?.remaining_attempts ??
                                    verbBaseAccess?.allowed_attempts ??
                                    1}{" "}
                                  pendiente(s)
                                </p>
                              </AttemptInfo>
                              <AttemptInfo
                                title="Past Simple Examen"
                                enabled={Boolean(pastAccess?.is_enabled)}
                              >
                                <p>
                                  {pastAccess?.is_enabled
                                    ? "Habilitado"
                                    : "Bloqueado"}
                                </p>
                                <p>
                                  Cupo: {pastAccess?.allowed_attempts ?? 1}{" "}
                                  intento(s)
                                </p>
                                <p>
                                  {pastAccess?.submitted_attempts ?? 0}{" "}
                                  completado(s)
                                </p>
                                <p>
                                  {pastAccess?.remaining_attempts ??
                                    pastAccess?.allowed_attempts ??
                                    1}{" "}
                                  pendiente(s)
                                </p>
                              </AttemptInfo>
                              <AttemptInfo
                                title="Present Simple Examen"
                                enabled={Boolean(presentAccess?.is_enabled)}
                              >
                                <p>
                                  {presentAccess?.is_enabled
                                    ? "Habilitado"
                                    : "Bloqueado"}
                                </p>
                                <p>
                                  Cupo: {presentAccess?.allowed_attempts ?? 1}{" "}
                                  intento(s)
                                </p>
                                <p>
                                  {presentAccess?.submitted_attempts ?? 0}{" "}
                                  completado(s)
                                </p>
                                <p>
                                  {presentAccess?.remaining_attempts ??
                                    presentAccess?.allowed_attempts ??
                                    1}{" "}
                                  pendiente(s)
                                </p>
                              </AttemptInfo>

                              <AttemptInfo
                                title="Present Perfect Examen"
                                enabled={Boolean(perfectAccess?.is_enabled)}
                              >
                                <p>
                                  {perfectAccess?.is_enabled
                                    ? "Habilitado"
                                    : "Bloqueado"}
                                </p>
                                <p>
                                  Cupo: {perfectAccess?.allowed_attempts ?? 1}{" "}
                                  intento(s)
                                </p>
                                <p>
                                  {perfectAccess?.submitted_attempts ?? 0}{" "}
                                  completado(s)
                                </p>
                                <p>
                                  {perfectAccess?.remaining_attempts ??
                                    perfectAccess?.allowed_attempts ??
                                    1}{" "}
                                  pendiente(s)
                                </p>
                              </AttemptInfo>
                              <AttemptInfo
                                title="Listening Examen"
                                enabled={Boolean(listeningAccess?.is_enabled)}
                              >
                                <p>
                                  {listeningAccess?.is_enabled
                                    ? "Habilitado"
                                    : "Bloqueado"}
                                </p>
                                <p>
                                  Cupo: {listeningAccess?.allowed_attempts ?? 1}{" "}
                                  intento(s)
                                </p>
                                <p>
                                  {listeningAccess?.submitted_attempts ?? 0}{" "}
                                  completado(s)
                                </p>
                                <p>
                                  {listeningAccess?.remaining_attempts ??
                                    listeningAccess?.allowed_attempts ??
                                    1}{" "}
                                  pendiente(s)
                                </p>
                              </AttemptInfo>
                            </ModuleGroup>
                            <ModuleGroup
                              title="Práctica"
                              tone="practice"
                              badge={enabledCountLabel(practiceEnabledFlags)}
                            >
                              <AttemptInfo
                                title="Verb Base Form Práctica"
                                enabled={Boolean(verbBaseAccess?.practice_enabled)}
                              >
                                <p>
                                  {verbBaseAccess?.practice_enabled
                                    ? "Habilitada"
                                    : "Bloqueada"}
                                </p>
                                <p>
                                  {verbBaseAccess?.practice_submitted_attempts ?? 0}{" "}
                                  sesión(es) completada(s)
                                </p>
                              </AttemptInfo>
                              <AttemptInfo
                                title="Verb Past Form Práctica"
                                enabled={Boolean(verbPastAccess?.practice_enabled)}
                              >
                                <p>
                                  {verbPastAccess?.practice_enabled
                                    ? "Habilitada"
                                    : "Bloqueada"}
                                </p>
                                <p>
                                  {verbPastAccess?.practice_submitted_attempts ?? 0}{" "}
                                  sesión(es) completada(s)
                                </p>
                              </AttemptInfo>
                              <AttemptInfo
                                title="Past Simple Práctica"
                                enabled={Boolean(pastAccess?.practice_enabled)}
                              >
                                <p>
                                  {pastAccess?.practice_enabled
                                    ? "Habilitada"
                                    : "Bloqueada"}
                                </p>
                                <p>
                                  {pastAccess?.practice_submitted_attempts ?? 0}{" "}
                                  sesión(es) completada(s)
                                </p>
                              </AttemptInfo>

                              <AttemptInfo
                                title="Present Simple Práctica"
                                enabled={Boolean(presentAccess?.practice_enabled)}
                              >
                                <p>
                                  {presentAccess?.practice_enabled
                                    ? "Habilitada"
                                    : "Bloqueada"}
                                </p>
                                <p>
                                  {presentAccess?.practice_submitted_attempts ?? 0}{" "}
                                  sesión(es) completada(s)
                                </p>
                              </AttemptInfo>

                              <AttemptInfo
                                title="Present Perfect Práctica"
                                enabled={Boolean(perfectAccess?.practice_enabled)}
                              >
                                <p>
                                  {perfectAccess?.practice_enabled
                                    ? "Habilitada"
                                    : "Bloqueada"}
                                </p>
                                <p>
                                  {perfectAccess?.practice_submitted_attempts ?? 0}{" "}
                                  sesión(es) completada(s)
                                </p>
                              </AttemptInfo>
                              <AttemptInfo
                                title="Listening Práctica"
                                enabled={Boolean(listeningAccess?.practice_enabled)}
                              >
                                <p>
                                  {listeningAccess?.practice_enabled
                                    ? "Habilitada"
                                    : "Bloqueada"}
                                </p>
                                <p>
                                  {listeningAccess?.practice_submitted_attempts ?? 0}{" "}
                                  sesión(es) completada(s)
                                </p>
                              </AttemptInfo>
                            </ModuleGroup>
                          </div>
                        );
                      })()
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {u.role === "STUDENT" && (
                        <Link
                          to={`/admin/students/${u.id}/report`}
                          className="btn-admin-primary inline-flex w-auto min-w-[9.5rem] shrink-0 px-4 shadow-sm"
                          title="Reporte general del estudiante"
                        >
                          Reporte general
                        </Link>
                      )}
                      <ModuleGroup title="Cuenta" tone="account">
                        <div className="grid w-full min-w-[10.5rem] max-w-[14rem] gap-2">
                          {(currentUser?.role === "SUPERADMIN" ||
                            u.role === "STUDENT") && (
                            <>
                              <button
                                type="button"
                                className="btn-admin-primary"
                                onClick={() => openEditModal(u)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn-admin-secondary"
                                onClick={() => openResetModal(u)}
                              >
                                Restablecer clave
                              </button>
                            </>
                          )}
                          {currentUser?.id !== u.id &&
                            (currentUser?.role === "SUPERADMIN" ||
                              u.role === "STUDENT") && (
                            <button
                              type="button"
                              className="btn-admin-danger"
                              disabled={
                                deleteUserMutation.isPending &&
                                deleteUserMutation.variables === u.id
                              }
                              onClick={() => {
                                const confirmed = window.confirm(
                                  `¿Eliminar al usuario ${u.username} (${roleLabel(u.role)})?\n\nSe borrarán su cuenta, intentos, prácticas y accesos. Esta acción no se puede deshacer.`,
                                );
                                if (confirmed) {
                                  deleteUserMutation.mutate(u.id);
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </ModuleGroup>

                      {u.role === "STUDENT" &&
                        (() => {
                          const verbAccess = u.exam_access?.find(
                            (item) => item.exam_type === "verb_exam",
                          );
                          const verbBaseAccess = u.exam_access?.find(
                            (item) => item.exam_type === "verb_base_exam",
                          );
                          const verbPastAccess = u.exam_access?.find(
                            (item) => item.exam_type === "verb_past_exam",
                          );
                          const pastAccess = u.exam_access?.find(
                            (item) => item.exam_type === "past_simple_exam",
                          );
                          const presentAccess = u.exam_access?.find(
                            (item) => item.exam_type === "present_simple_exam",
                          );
                          const perfectAccess = u.exam_access?.find(
                            (item) => item.exam_type === "present_perfect_exam",
                          );
                          const listeningAccess = u.exam_access?.find(
                            (item) => item.exam_type === "listening_practice",
                          );
                          const busyAccess = (
                            examType: ExamType,
                            kind: "exam" | "practice",
                          ) =>
                            accessMutation.isPending &&
                            accessMutation.variables?.userId === u.id &&
                            accessMutation.variables?.examType === examType &&
                            (kind === "practice"
                              ? accessMutation.variables?.practiceEnabled !==
                                undefined
                              : accessMutation.variables?.isEnabled !== undefined);
                          const busyAllow = (
                            examType: ExamType,
                            mode: "exam" | "practice",
                          ) =>
                            allowAttemptMutation.isPending &&
                            allowAttemptMutation.variables?.userId === u.id &&
                            allowAttemptMutation.variables?.examType === examType &&
                            (allowAttemptMutation.variables?.mode ?? "exam") ===
                              mode;
                          const busyReset = (
                            examType: ExamType,
                            mode: "exam" | "practice",
                          ) =>
                            resetModuleMutation.isPending &&
                            resetModuleMutation.variables?.userId === u.id &&
                            resetModuleMutation.variables?.examType === examType &&
                            (resetModuleMutation.variables?.mode ?? "exam") ===
                              mode;
                          const bulkBusyForUser =
                            bulkAccessMutation.isPending &&
                            bulkAccessMutation.variables?.userId === u.id;
                          const examEnabledFlags = [
                            verbAccess?.is_enabled,
                            verbBaseAccess?.is_enabled,
                            pastAccess?.is_enabled,
                            presentAccess?.is_enabled,
                            perfectAccess?.is_enabled,
                            listeningAccess?.is_enabled,
                          ];
                          const practiceEnabledFlags = [
                            verbBaseAccess?.practice_enabled,
                            verbPastAccess?.practice_enabled,
                            pastAccess?.practice_enabled,
                            presentAccess?.practice_enabled,
                            perfectAccess?.practice_enabled,
                            listeningAccess?.practice_enabled,
                          ];

                          return (
                            <>
                              <ModuleGroup
                                title="Acceso general"
                                tone="account"
                                badge={enabledCountLabel([
                                  ...examEnabledFlags,
                                  ...practiceEnabledFlags,
                                ])}
                              >
                                <div className="w-full min-w-[15rem] max-w-[18rem] space-y-2">
                                  <p className="text-[11px] leading-snug text-gray-600">
                                    Cambia todos los módulos de este estudiante
                                    de una vez. Luego puedes activar solo uno.
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      className="btn-admin-success"
                                      disabled={bulkBusyForUser}
                                      onClick={() =>
                                        bulkAccessMutation.mutate({
                                          userId: u.id,
                                          exams: true,
                                          practices: true,
                                        })
                                      }
                                    >
                                      Habilitar todo
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-admin-muted"
                                      disabled={bulkBusyForUser}
                                      onClick={() =>
                                        bulkAccessMutation.mutate({
                                          userId: u.id,
                                          exams: false,
                                          practices: false,
                                        })
                                      }
                                    >
                                      Bloquear todo
                                    </button>
                                  </div>
                                  <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-brand-primary/80">
                                    Solo exámenes
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      className="btn-admin-success"
                                      disabled={bulkBusyForUser}
                                      onClick={() =>
                                        bulkAccessMutation.mutate({
                                          userId: u.id,
                                          exams: true,
                                        })
                                      }
                                    >
                                      Habilitar
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-admin-muted"
                                      disabled={bulkBusyForUser}
                                      onClick={() =>
                                        bulkAccessMutation.mutate({
                                          userId: u.id,
                                          exams: false,
                                        })
                                      }
                                    >
                                      Bloquear
                                    </button>
                                  </div>
                                  <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-brand-primary/80">
                                    Solo práctica
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      className="btn-admin-success"
                                      disabled={bulkBusyForUser}
                                      onClick={() =>
                                        bulkAccessMutation.mutate({
                                          userId: u.id,
                                          practices: true,
                                        })
                                      }
                                    >
                                      Habilitar
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-admin-muted"
                                      disabled={bulkBusyForUser}
                                      onClick={() =>
                                        bulkAccessMutation.mutate({
                                          userId: u.id,
                                          practices: false,
                                        })
                                      }
                                    >
                                      Bloquear
                                    </button>
                                  </div>
                                </div>
                              </ModuleGroup>
                              <ModuleGroup
                                title="Exámenes"
                                tone="exam"
                                badge={enabledCountLabel(examEnabledFlags)}
                              >
                                <ActionGroup
                                  title="Verb Exam"
                                  enabled={Boolean(verbAccess?.is_enabled)}
                                >
                                  <button
                                    type="button"
                                    className={
                                      verbAccess?.is_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess("verb_exam", "exam")}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "verb_exam",
                                        isEnabled: !verbAccess?.is_enabled,
                                      })
                                    }
                                  >
                                    {verbAccess?.is_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-primary"
                                    title="Suma 1 al cupo total de intentos (se acumula)"
                                    disabled={busyAllow("verb_exam", "exam")}
                                    onClick={() =>
                                      allowAttemptMutation.mutate({
                                        userId: u.id,
                                        examType: "verb_exam",
                                        mode: "exam",
                                      })
                                    }
                                  >
                                    Sumar intento
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset("verb_exam", "exam")}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear Verb Exam de ${u.username}?\n\nSe eliminarán sus intentos y quedará 1 disponible.`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "verb_exam",
                                          mode: "exam",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>

                                <ActionGroup
                                  title="Verb Base Form"
                                  enabled={Boolean(verbBaseAccess?.is_enabled)}
                                >
                                  <button
                                    type="button"
                                    className={
                                      verbBaseAccess?.is_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "verb_base_exam",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "verb_base_exam",
                                        isEnabled: !verbBaseAccess?.is_enabled,
                                      })
                                    }
                                  >
                                    {verbBaseAccess?.is_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-primary"
                                    title="Suma 1 al cupo total de intentos (se acumula)"
                                    disabled={busyAllow(
                                      "verb_base_exam",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      allowAttemptMutation.mutate({
                                        userId: u.id,
                                        examType: "verb_base_exam",
                                        mode: "exam",
                                      })
                                    }
                                  >
                                    Sumar intento
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "verb_base_exam",
                                      "exam",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear Verb Base Form de ${u.username}?\n\nSe eliminarán sus intentos y quedará 1 disponible.`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "verb_base_exam",
                                          mode: "exam",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>

                                <ActionGroup
                                  title="Past Simple Examen"
                                  enabled={Boolean(pastAccess?.is_enabled)}
                                >
                                  <button
                                    type="button"
                                    className={
                                      pastAccess?.is_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "past_simple_exam",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "past_simple_exam",
                                        isEnabled: !pastAccess?.is_enabled,
                                      })
                                    }
                                  >
                                    {pastAccess?.is_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-primary"
                                    title="Suma 1 al cupo total de intentos (se acumula)"
                                    disabled={busyAllow(
                                      "past_simple_exam",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      allowAttemptMutation.mutate({
                                        userId: u.id,
                                        examType: "past_simple_exam",
                                        mode: "exam",
                                      })
                                    }
                                  >
                                    Sumar intento
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "past_simple_exam",
                                      "exam",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear el EXAMEN Past Simple de ${u.username}?\n\nSe eliminarán solo los intentos del examen (no la práctica) y quedará 1 intento disponible.`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "past_simple_exam",
                                          mode: "exam",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>

                                <ActionGroup
                                  title="Present Simple Examen"
                                  enabled={Boolean(presentAccess?.is_enabled)}
                                >
                                  <button
                                    type="button"
                                    className={
                                      presentAccess?.is_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "present_simple_exam",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "present_simple_exam",
                                        isEnabled: !presentAccess?.is_enabled,
                                      })
                                    }
                                  >
                                    {presentAccess?.is_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-primary"
                                    title="Suma 1 al cupo total de intentos (se acumula)"
                                    disabled={busyAllow(
                                      "present_simple_exam",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      allowAttemptMutation.mutate({
                                        userId: u.id,
                                        examType: "present_simple_exam",
                                        mode: "exam",
                                      })
                                    }
                                  >
                                    Sumar intento
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "present_simple_exam",
                                      "exam",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear el EXAMEN Present Simple de ${u.username}?\n\nSe eliminarán sus intentos y quedará 1 disponible.`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "present_simple_exam",
                                          mode: "exam",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>

                                <ActionGroup
                                  title="Present Perfect Examen"
                                  enabled={Boolean(perfectAccess?.is_enabled)}
                                >
                                  <button
                                    type="button"
                                    className={
                                      perfectAccess?.is_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "present_perfect_exam",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "present_perfect_exam",
                                        isEnabled: !perfectAccess?.is_enabled,
                                      })
                                    }
                                  >
                                    {perfectAccess?.is_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-primary"
                                    title="Suma 1 al cupo total de intentos (se acumula)"
                                    disabled={busyAllow(
                                      "present_perfect_exam",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      allowAttemptMutation.mutate({
                                        userId: u.id,
                                        examType: "present_perfect_exam",
                                        mode: "exam",
                                      })
                                    }
                                  >
                                    Sumar intento
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "present_perfect_exam",
                                      "exam",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear el EXAMEN Present Perfect de ${u.username}?\n\nSe eliminarán solo los intentos del examen (no la práctica) y quedará 1 intento disponible.`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "present_perfect_exam",
                                          mode: "exam",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>

                                <ActionGroup
                                  title="Listening Examen"
                                  enabled={Boolean(listeningAccess?.is_enabled)}
                                >
                                  <button
                                    type="button"
                                    className={
                                      listeningAccess?.is_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "listening_practice",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "listening_practice",
                                        isEnabled: !listeningAccess?.is_enabled,
                                      })
                                    }
                                  >
                                    {listeningAccess?.is_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-primary"
                                    title="Suma 1 al cupo total de intentos (se acumula)"
                                    disabled={busyAllow(
                                      "listening_practice",
                                      "exam",
                                    )}
                                    onClick={() =>
                                      allowAttemptMutation.mutate({
                                        userId: u.id,
                                        examType: "listening_practice",
                                        mode: "exam",
                                      })
                                    }
                                  >
                                    Sumar intento
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "listening_practice",
                                      "exam",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear el EXAMEN Listening de ${u.username}?\n\nSe eliminarán solo los intentos del examen (no la práctica) y quedará 1 intento disponible.`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "listening_practice",
                                          mode: "exam",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>
                              </ModuleGroup>

                              <ModuleGroup
                                title="Práctica"
                                tone="practice"
                                badge={enabledCountLabel(practiceEnabledFlags)}
                              >
                                <ActionGroup
                                  title="Verb Base Form Práctica"
                                  enabled={Boolean(
                                    verbBaseAccess?.practice_enabled,
                                  )}
                                >
                                  <button
                                    type="button"
                                    className={
                                      verbBaseAccess?.practice_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "verb_base_exam",
                                      "practice",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "verb_base_exam",
                                        practiceEnabled:
                                          !verbBaseAccess?.practice_enabled,
                                      })
                                    }
                                  >
                                    {verbBaseAccess?.practice_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <Link
                                    to={`/admin/students/${u.id}/practice/verb-base`}
                                    className="btn-admin-secondary"
                                  >
                                    Ver sesiones (
                                    {verbBaseAccess?.practice_submitted_attempts ??
                                      0}
                                    )
                                  </Link>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "verb_base_exam",
                                      "practice",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear la PRÁCTICA Verb Base Form de ${u.username}?\n\nSe eliminarán solo las sesiones de práctica (no el examen).`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "verb_base_exam",
                                          mode: "practice",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>
                                <ActionGroup
                                  title="Verb Past Form Práctica"
                                  enabled={Boolean(
                                    verbPastAccess?.practice_enabled,
                                  )}
                                >
                                  <button
                                    type="button"
                                    className={
                                      verbPastAccess?.practice_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "verb_past_exam",
                                      "practice",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "verb_past_exam",
                                        practiceEnabled:
                                          !verbPastAccess?.practice_enabled,
                                      })
                                    }
                                  >
                                    {verbPastAccess?.practice_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <Link
                                    to={`/admin/students/${u.id}/practice/verb-past`}
                                    className="btn-admin-secondary"
                                  >
                                    Ver sesiones (
                                    {verbPastAccess?.practice_submitted_attempts ??
                                      0}
                                    )
                                  </Link>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "verb_past_exam",
                                      "practice",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear la PRÁCTICA Verb Past Form de ${u.username}?\n\nSe eliminarán solo las sesiones de práctica.`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "verb_past_exam",
                                          mode: "practice",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>
                                <ActionGroup
                                  title="Past Simple Práctica"
                                  enabled={Boolean(pastAccess?.practice_enabled)}
                                >
                                  <button
                                    type="button"
                                    className={
                                      pastAccess?.practice_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "past_simple_exam",
                                      "practice",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "past_simple_exam",
                                        practiceEnabled:
                                          !pastAccess?.practice_enabled,
                                      })
                                    }
                                  >
                                    {pastAccess?.practice_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <Link
                                    to={`/admin/students/${u.id}/report`}
                                    className="btn-admin-secondary"
                                  >
                                    Ver sesiones (
                                    {pastAccess?.practice_submitted_attempts ??
                                      0}
                                    )
                                  </Link>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "past_simple_exam",
                                      "practice",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear la PRÁCTICA Past Simple de ${u.username}?\n\nSe eliminarán solo las sesiones de práctica (no el examen).`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "past_simple_exam",
                                          mode: "practice",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>
                                <ActionGroup
                                  title="Present Simple Práctica"
                                  enabled={Boolean(
                                    presentAccess?.practice_enabled,
                                  )}
                                >
                                  <button
                                    type="button"
                                    className={
                                      presentAccess?.practice_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "present_simple_exam",
                                      "practice",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "present_simple_exam",
                                        practiceEnabled:
                                          !presentAccess?.practice_enabled,
                                      })
                                    }
                                  >
                                    {presentAccess?.practice_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <Link
                                    to={`/admin/students/${u.id}/report`}
                                    className="btn-admin-secondary"
                                  >
                                    Ver sesiones (
                                    {presentAccess?.practice_submitted_attempts ??
                                      0}
                                    )
                                  </Link>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "present_simple_exam",
                                      "practice",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear la PRÁCTICA Present Simple de ${u.username}?\n\nSe eliminarán solo las sesiones de práctica (no el examen).`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "present_simple_exam",
                                          mode: "practice",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>
                                <ActionGroup
                                  title="Present Perfect Práctica"
                                  enabled={Boolean(
                                    perfectAccess?.practice_enabled,
                                  )}
                                >
                                  <button
                                    type="button"
                                    className={
                                      perfectAccess?.practice_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "present_perfect_exam",
                                      "practice",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "present_perfect_exam",
                                        practiceEnabled:
                                          !perfectAccess?.practice_enabled,
                                      })
                                    }
                                  >
                                    {perfectAccess?.practice_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <Link
                                    to={`/admin/students/${u.id}/report`}
                                    className="btn-admin-secondary"
                                  >
                                    Ver sesiones (
                                    {perfectAccess?.practice_submitted_attempts ??
                                      0}
                                    )
                                  </Link>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "present_perfect_exam",
                                      "practice",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear la PRÁCTICA Present Perfect de ${u.username}?\n\nSe eliminarán solo las sesiones de práctica (no el examen).`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "present_perfect_exam",
                                          mode: "practice",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>
                                <ActionGroup
                                  title="Listening Práctica"
                                  enabled={Boolean(
                                    listeningAccess?.practice_enabled,
                                  )}
                                >
                                  <button
                                    type="button"
                                    className={
                                      listeningAccess?.practice_enabled
                                        ? "btn-admin-muted"
                                        : "btn-admin-success"
                                    }
                                    disabled={busyAccess(
                                      "listening_practice",
                                      "practice",
                                    )}
                                    onClick={() =>
                                      accessMutation.mutate({
                                        userId: u.id,
                                        examType: "listening_practice",
                                        practiceEnabled:
                                          !listeningAccess?.practice_enabled,
                                      })
                                    }
                                  >
                                    {listeningAccess?.practice_enabled
                                      ? "Bloquear"
                                      : "Habilitar"}
                                  </button>
                                  <Link
                                    to={`/admin/students/${u.id}/report`}
                                    className="btn-admin-secondary"
                                  >
                                    Ver sesiones (
                                    {listeningAccess?.practice_submitted_attempts ??
                                      0}
                                    )
                                  </Link>
                                  <button
                                    type="button"
                                    className="btn-admin-danger"
                                    disabled={busyReset(
                                      "listening_practice",
                                      "practice",
                                    )}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `¿Resetear la PRÁCTICA Listening de ${u.username}?\n\nSe eliminarán las sesiones de listening.`,
                                      );
                                      if (confirmed) {
                                        resetModuleMutation.mutate({
                                          userId: u.id,
                                          examType: "listening_practice",
                                          mode: "practice",
                                        });
                                      }
                                    }}
                                  >
                                    Resetear
                                  </button>
                                </ActionGroup>

                              </ModuleGroup>
                            </>
                          );
                        })()}
                    </div>
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
