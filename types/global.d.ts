import { type IpcRendererEvent } from "electron";

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_SENTRY_ENVIRONMENT?: string;
    readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    ipc: {
      send: (event: string, payload?: any) => void;
      invoke: (event: string, payload?: any) => Promise<any>;
      on: (
        event: string,
        callback: (event: IpcRendererEvent, ...args: any[]) => void
      ) => void;
    };
    openUrl: (e: Event, url: string) => void;
    getFilePath: (file: File) => string;
    removeLoading: () => void;
  }
}
