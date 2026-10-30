import { handleKewpa7Extract } from './kewpa7.ts';
import type { ApiEnv } from './env.ts';

const notFound = () =>
  new Response(
    JSON.stringify({ success: false, message: 'Laluan API tidak ditemui' }),
    { status: 404, headers: { 'content-type': 'application/json' } }
  );

/**
 * Dev-only API surface served by the Vite server.
 * Application data lives in Cloudflare D1 and is read from the Hono worker
 * (`VITE_API_URL`); only the local KEW.PA-7 parser needs a dev server.
 */
export async function handleApiRequest(
  request: Request,
  env: ApiEnv
): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === '/api/kewpa7/extract') {
    return handleKewpa7Extract(request, env);
  }

  return notFound();
}
