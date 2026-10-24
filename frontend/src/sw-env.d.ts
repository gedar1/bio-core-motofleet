/// <reference types="vite/client" />

interface WorkerGlobalScope {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
}
