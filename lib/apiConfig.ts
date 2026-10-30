/**
 * Base URL of the Hono Cloudflare Worker backend.
 * Local dev defaults to the `wrangler dev` port; production builds receive the
 * deployed worker URL through the `VITE_API_URL` environment variable.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8787';

/**
 * KEW.PA-7 extraction endpoint.
 * In dev the Vite middleware serves the three-tier parser locally; production
 * builds have no server, so the request is sent to the Hono worker instead.
 */
export const KEWPA7_EXTRACT_URL = import.meta.env.DEV
  ? '/api/kewpa7/extract'
  : `${API_BASE_URL}/api/kewpa7/extract`;
