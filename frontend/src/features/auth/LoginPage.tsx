import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../lib/endpoints";
import { ApiError } from "../../lib/api";
import { notifyAuthChanged } from "../../lib/authEvents";

const schema = z.object({
  username: z.string().min(1, "Ingresa tu usuario"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const result = await authApi.login(data.username, data.password);
      queryClient.setQueryData(["auth", "me"], result.user);
      queryClient.clear();
      queryClient.setQueryData(["auth", "me"], result.user);
      notifyAuthChanged();
      if (result.must_change_password) {
        navigate("/change-password");
      } else if (result.user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand-primary px-4 py-8 text-brand-white">
        <div className="mx-auto max-w-md text-center">
          <p className="text-sm text-brand-sky">Powerful English Academy</p>
          <h1 className="mt-2 text-2xl font-bold">Simulador de verbos</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4" noValidate>
          <h2 className="text-lg font-semibold">Iniciar sesión</h2>
          <p className="text-sm text-gray-600">
            Si es tu primer acceso, usa la contraseña temporal del profesor. Al entrar deberás
            cambiarla por una personal.
          </p>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium">
              Usuario
            </label>
            <input
              id="username"
              autoComplete="username"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky"
              {...register("username")}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-danger">{errors.username.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-sky"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 min-h-11 min-w-11 -translate-y-1/2 text-sm text-gray-500"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
            )}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
