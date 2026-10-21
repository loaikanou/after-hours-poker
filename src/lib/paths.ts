/**
 * Public path of the app: "/" on Vercel, or a subpath when built with
 * BASE_PATH. Build every public-file URL through this helper.
 */
export const BASE_URL = import.meta.env.BASE_URL;

export function asset(path: string): string {
  return `${BASE_URL}${path.replace(/^\//, "")}`;
}
