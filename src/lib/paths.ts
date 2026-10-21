/**
 * The app can be served from the domain root (Vercel) or a subpath such as
 * GitHub Pages' `/<repo>/`. Vite's `base` (from BASE_PATH at build time) sets
 * BASE_URL; build every public-file URL through this helper.
 */
export const BASE_URL = import.meta.env.BASE_URL;

export function asset(path: string): string {
  return `${BASE_URL}${path.replace(/^\//, "")}`;
}
