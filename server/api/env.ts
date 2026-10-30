/** Environment values forwarded from the Vite dev/preview server to the local API handlers. */
export interface ApiEnv {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  /** Base URL of the Hono Cloudflare Worker backend (e.g. http://localhost:8787). */
  BACKEND_URL?: string;
}
