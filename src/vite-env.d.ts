/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by `vite.config.mts` at build time, e.g. `1.0.0+build.12`. */
declare const __APP_VERSION__: string;

/** ISO timestamp of the build that produced the running bundle. */
declare const __BUILD_TIME__: string;

/** Nombor binaan yang menghasilkan bundle ini — dibandingkan dengan `/version.json` semasa runtime. */
declare const __BUILD_NUMBER__: number;
