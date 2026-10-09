/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ORIGIN?: string;
  /** Serveur de voix clonée (page Audio). Vide : mode aperçu. */
  readonly VITE_VOICE_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
