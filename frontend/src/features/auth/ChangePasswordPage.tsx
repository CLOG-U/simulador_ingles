import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../lib/endpoints";
import { ApiError } from "../../lib/api";
import { useAuth } from "./AuthProvider";

const schema = z
  .object({
    current_password: z.string().min(1, "Ingresa tu contraseña actual"),
    new_password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm_password: z.string().min(8, "Confirma la contraseña"),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mustChange = user?.must_change_password ?? false;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user && !user.must_change_password) {
      navigate(user.role === "ADMIN" ? "/admin" : "/student", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await authApi.changePassword(data.current_password, data.new_password);
      const updated = await authApi.me();
      if (!updated) {
        navigate("/login", { replace: true });
        return;
      }
      queryClient.setQueryData(["auth", "me"], updated);
      navigate(updated.role === "ADMIN" ? "/admin" : "/student", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña");
    }
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <h1 className="text-xl font-bold">Cambiar contraseña</h1>
          {mustChange ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              <p className="font-medium">Primer acceso o contraseña restablecida</p>
              <p className="mt-1">
                Usa la contraseña temporal que te dio el profesor como «contraseña actual» y
                elige una contraseña nueva personal. No podrás usar el simulador hasta completar
                este paso.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Debes establecer una contraseña personal antes de continuar.
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          {(["current_password", "new_password", "confirm_password"] as const).map((field) => (
            <div key={field}>
              <label htmlFor={field} className="mb-1 block text-sm font-medium">
                {field === "current_password"
                  ? mustChange
                    ? "Contraseña temporal (actual)"
                    : "Contraseña actual"
                  : field === "new_password"
                    ? "Nueva contraseña"
                    : "Confirmar contraseña"}
              </label>
              <input
                id={field}
                type="password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky"
                {...register(field)}
              />
              {errors[field] && (
                <p className="mt-1 text-sm text-danger">{errors[field]?.message}</p>
              )}
            </div>
          ))}
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            Guardar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}
