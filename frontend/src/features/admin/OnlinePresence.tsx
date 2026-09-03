import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/endpoints";
import { roleLabel, type OnlineUser } from "../../lib/types";

export function formatSeenAgo(iso: string, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes === 1) return "hace 1 min";
  return `hace ${minutes} min`;
}

function useOnlineUsers() {
  return useQuery({
    queryKey: ["admin-online-users"],
    queryFn: adminApi.onlineUsers,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

function PresenceDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
    </span>
  );
}

function OnlineUserRow({
  user,
  compact = false,
}: {
  user: OnlineUser;
  compact?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={`truncate font-medium ${compact ? "text-xs" : "text-sm"}`}>
          {user.full_name}
        </p>
        <p className="truncate text-[11px] text-gray-500">
          @{user.username} · {roleLabel(user.role)}
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-emerald-700">
        {formatSeenAgo(user.last_seen_at)}
      </span>
    </li>
  );
}

export function OnlinePresenceWidget() {
  const { data } = useOnlineUsers();
  const count = data?.count ?? 0;
  const students = data?.student_count ?? 0;

  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
        <PresenceDot />
        <span>
          {count} en línea
          {count > 0 ? (
            <span className="ml-1 hidden text-white/70 sm:inline">
              ({students} est.)
            </span>
          ) : null}
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-brand-primary/15 bg-white p-3 text-brand-primary-dark shadow-lg">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Quién está online
        </p>
        {count === 0 ? (
          <p className="text-sm text-gray-500">Nadie está activo ahora.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {data?.items.map((user) => (
              <OnlineUserRow key={user.id} user={user} compact />
            ))}
          </ul>
        )}
        <Link
          to="/admin/users"
          className="mt-3 block text-xs font-semibold text-brand-primary hover:underline"
        >
          Ver usuarios
        </Link>
      </div>
    </details>
  );
}

export function OnlinePresenceBoard() {
  const { data, isLoading } = useOnlineUsers();
  const count = data?.count ?? 0;

  return (
    <section className="card border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <PresenceDot />
            En línea ahora
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Quien tiene la plataforma abierta en los últimos{" "}
            {data?.threshold_minutes ?? 3} minutos.
          </p>
        </div>
        <p className="text-3xl font-bold text-emerald-700">{isLoading ? "…" : count}</p>
      </div>
      {count === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Nadie está activo ahora.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {data?.items.map((user) => (
            <OnlineUserRow key={user.id} user={user} />
          ))}
        </ul>
      )}
    </section>
  );
}
