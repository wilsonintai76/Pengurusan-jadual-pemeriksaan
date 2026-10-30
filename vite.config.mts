import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createApiMiddleware } from './server/api/node.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const { build } = JSON.parse(readFileSync(new URL('./version.json', import.meta.url), 'utf8'));

const appVersion = `${pkg.version}+build.${build}`;
const builtAt = new Date().toISOString();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiMiddleware = createApiMiddleware({
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
    BACKEND_URL: env.VITE_API_URL || env.CLOUDFLARE_WORKER_URL,
  });

  return {
    plugins: [
      react(),
      {
        name: 'poliku-api',
        configureServer(server) {
          server.middlewares.use(apiMiddleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(apiMiddleware);
        },
      },
      {
        // Exposes the deployed version at /version.json for smoke checks.
        name: 'poliku-version',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: JSON.stringify({ version: appVersion, build, builtAt }, null, 2),
          });
        },
      },
    ],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(builtAt),
      __BUILD_NUMBER__: JSON.stringify(build),
    },
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    server: {
      port: 3000,
    },
    preview: {
      port: 3000,
    },
  };
});
