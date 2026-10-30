#!/usr/bin/env node
/**
 * Versioned Cloudflare deploy.
 *
 *   1. Bumps the build counter in version.json (`<pkg.version>+build.N`)
 *   2. Migrates the remote D1 schema and deploys the Hono worker (optional)
 *   3. Builds the Vite SPA with the backend URL baked in
 *   4. Deploys the SPA worker with the version as the Cloudflare version tag
 *
 * Usage:
 *   node scripts/deploy.mjs                 # backend + frontend
 *   node scripts/deploy.mjs --backend-only
 *   node scripts/deploy.mjs --frontend-only # needs VITE_API_URL or a deployed backend
 *   node scripts/deploy.mjs --skip-migrate
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);

const flags = new Set(process.argv.slice(2));
const backendOnly = flags.has('--backend-only');
const frontendOnly = flags.has('--frontend-only');
const skipMigrate = flags.has('--skip-migrate');

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const { build: previousBuild } = JSON.parse(readFileSync('version.json', 'utf8'));
const build = previousBuild + 1;
const version = `${pkg.version}+build.${build}`;
const tag = `v${pkg.version}-build.${build}`;
const message = `Deploy ${version} pada ${new Date().toISOString()}`;

function run(command, { capture = false, env = process.env } = {}) {
  const result = spawnSync(command, {
    cwd: root,
    env,
    shell: true,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });

  if (capture && result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`Arahan gagal (kod ${result.status}): ${command}`);
  }
  return result.stdout ?? '';
}

function findWorkersUrl(output) {
  const match = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i);
  return match ? match[0] : null;
}

function readProductionApiUrl() {
  try {
    const content = readFileSync('.env.production', 'utf8');
    const match = content.match(/^\s*VITE_API_URL\s*=\s*"?([^"\n]+)"?\s*$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function discoverBackendUrl() {
  return (
    process.env.VITE_API_URL ||
    readProductionApiUrl() ||
    findWorkersUrl(
      run('npx wrangler deployments status --config backend/wrangler.jsonc --json', {
        capture: true,
      })
    )
  );
}

console.log(`\n▶ Versi deploy: ${version} (tag: ${tag})\n`);

let backendUrl = frontendOnly ? discoverBackendUrl() : null;

if (!frontendOnly) {
  if (!skipMigrate) {
    console.log('▶ Migrasi skema D1 (remote)…');
    run(
      'npx wrangler d1 execute poliku-aset-d1 --remote --config backend/wrangler.jsonc --file=backend/schema.sql'
    );
  }

  console.log('▶ Deploy backend Hono…');
  backendUrl =
    findWorkersUrl(
      run(
        `npx wrangler deploy --config backend/wrangler.jsonc --tag ${tag} --message "${message}"`,
        { capture: true }
      )
    ) || discoverBackendUrl();
}

if (!backendOnly && !backendUrl) {
  throw new Error(
    'URL backend tidak diketahui. Tetapkan VITE_API_URL atau jalankan deploy backend terlebih dahulu.'
  );
}

writeFileSync('version.json', `${JSON.stringify({ build }, null, 2)}\n`);

let frontendUrl = null;

if (!backendOnly) {
  console.log(`\n▶ Build frontend (VITE_API_URL=${backendUrl})…`);
  run('npm run build', {
    env: { ...process.env, VITE_API_URL: backendUrl },
  });

  console.log('▶ Deploy frontend (Workers Static Assets)…');
  frontendUrl = findWorkersUrl(
    run(
      `npx wrangler deploy --config wrangler.jsonc --tag ${tag} --message "${message}"`,
      { capture: true }
    )
  );
}

console.log('\n✅ Selesai');
console.log(`   Versi    : ${version}`);
if (backendUrl) console.log(`   Backend  : ${backendUrl}`);
if (frontendUrl) console.log(`   Frontend : ${frontendUrl}`);
