import { clearSession } from './authClient';

/**
 * Pemerhati versi: apabila `/version.json` menunjukkan binaan yang lebih baharu daripada
 * bundle yang sedang berjalan, sesi ditamatkan, cache pelayar dibersihkan dan halaman
 * dimuat semula supaya pengguna tidak terus menggunakan kod/lajur data yang lapuk.
 */

const AUTH_USER_KEY = 'ejas_auth_user';
const RELOAD_GUARD_KEY = 'ejas:build-reload';
const POLL_INTERVAL_MS = 60_000;
const RELOAD_DELAY_MS = 2_000;

/** Dipancarkan sebelum muat semula supaya UI boleh memaklumkan pengguna. */
export const NEW_VERSION_EVENT = 'ejas:new-version';

const runningBuild: number | null =
  typeof __BUILD_NUMBER__ === 'number' && Number.isFinite(__BUILD_NUMBER__) ? __BUILD_NUMBER__ : null;

interface VersionInfo {
  build?: number;
  version?: string;
}

async function fetchDeployedBuild(): Promise<number | null> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const info = (await response.json()) as VersionInfo;
    return typeof info.build === 'number' ? info.build : null;
  } catch {
    return null;
  }
}

async function clearBrowserCaches(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // Cache Storage tidak tersedia — abaikan.
  }
}

/** Log keluar, kosongkan cache dan muat semula halaman dengan nombor binaan baharu. */
async function reloadWithNewBuild(build: number): Promise<void> {
  try {
    // Elak gelung muat semula jika CDN masih menyajikan bundle lama bagi binaan yang sama.
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === String(build)) {
      console.warn(`[versi] Binaan ${build} masih belum diterima selepas muat semula — berhenti mencuba.`);
      return;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(build));
  } catch {
    // sessionStorage tidak tersedia — teruskan.
  }

  window.dispatchEvent(new CustomEvent(NEW_VERSION_EVENT, { detail: { build } }));

  clearSession();
  try {
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // storan setempat tidak tersedia
  }

  await clearBrowserCaches();
  await new Promise((resolve) => window.setTimeout(resolve, RELOAD_DELAY_MS));

  const url = new URL(window.location.href);
  url.searchParams.set('v', String(build));
  window.location.replace(url.toString());
}

/** Semak sekali; pulangkan `true` jika versi baharu dikesan. */
export async function checkForNewVersion(): Promise<boolean> {
  if (runningBuild === null) return false;

  const deployedBuild = await fetchDeployedBuild();
  if (deployedBuild === null) return false;
  if (deployedBuild <= runningBuild) return false;

  await reloadWithNewBuild(deployedBuild);
  return true;
}

/** Pantau versi semasa halaman dibuka, apabila tab kembali fokus, dan setiap minit. */
export function watchForNewVersion(): () => void {
  void checkForNewVersion();

  const interval = window.setInterval(() => {
    void checkForNewVersion();
  }, POLL_INTERVAL_MS);

  const onFocus = () => {
    if (document.visibilityState === 'visible') void checkForNewVersion();
  };

  document.addEventListener('visibilitychange', onFocus);
  window.addEventListener('focus', onFocus);

  return () => {
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onFocus);
    window.removeEventListener('focus', onFocus);
  };
}
