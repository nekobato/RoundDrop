import { init } from "@sentry/electron/renderer";
import pkg from "../package.json";

export const initSentry = () => {
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: pkg.version,
    environment: process.env.NODE_ENV
  });
};
