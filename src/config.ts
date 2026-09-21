const origin = (import.meta.env.VITE_APP_ORIGIN ?? "https://jokubot.com").replace(
  /\/$/,
  "",
);

export const APP_ORIGIN = origin;

export function appHref(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${APP_ORIGIN}${suffix}`;
}

export function siteHref(path = "/"): string {
  const base = import.meta.env.BASE_URL;
  const suffix = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${suffix}`;
}
