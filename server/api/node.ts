import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';
import { handleApiRequest } from './index.ts';
import type { ApiEnv } from './env.ts';

async function readBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function toWebHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  return headers;
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const headers = toWebHeaders(req);

  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers });
  }

  return new Request(url, {
    method,
    headers,
    body: (await readBody(req)).buffer as ArrayBuffer,
  });
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      res.setHeader(key, value);
    }
  });

  const body = response.body ? Buffer.from(await response.arrayBuffer()) : null;
  res.end(body ?? undefined);
}

/** Connect-style middleware that serves the local API routes during `vite dev` and `vite preview`. */
export function createApiMiddleware(env: ApiEnv): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const pathname = (req.url || '').split('?')[0];

    if (!pathname.startsWith('/api/')) {
      next();
      return;
    }

    try {
      const response = await handleApiRequest(await toWebRequest(req), env);
      await sendWebResponse(res, response);
    } catch (error) {
      console.error('[api] Ralat memproses permintaan API:', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
      }
      res.end(
        JSON.stringify({ success: false, message: 'Ralat pelayan API dalaman' })
      );
    }
  };
}
