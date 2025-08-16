/// <reference types="vite/client" />
declare module '@livekit/components-react';

interface ImportMetaEnv {
  readonly VITE_LIVEKIT_URL?: string
  readonly VITE_BACKEND_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 