import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserMe } from "../../lib/types";
import { authApi } from "../../lib/endpoints";
import { setOnUnauthorized, isAuthPublicPath } from "../../lib/api";
import { AUTH_SYNC_KEY, notifyAuthChanged } from "../../lib/authEvents";

interface AuthContextValue {
  user: UserMe | null | undefined;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setOnUnauthorized(() => {
      if (isAuthPublicPath()) return;
      queryClient.setQueryData(["auth", "me"], null);
      window.location.assign("/login");
    });
  }, [queryClient]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_SYNC_KEY) return;
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  const logout = async () => {
    await authApi.logout();
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.clear();
    notifyAuthChanged();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        refetch: () => refetch(),
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
