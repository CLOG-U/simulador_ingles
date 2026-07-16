export const AUTH_SYNC_KEY = "simulador-auth-sync";

export function notifyAuthChanged() {
  localStorage.setItem(AUTH_SYNC_KEY, String(Date.now()));
}
