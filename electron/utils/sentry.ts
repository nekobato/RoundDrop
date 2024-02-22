import { init, captureException } from "@sentry/electron/main";
import { app } from "electron";

export const initSentry = () => {
  init({
    dsn: process.env.SENTRY_DSN,
    release: app.getVersion(),
    environment: process.env.NODE_ENV
  });
};

export const reportError = (error: Error) => {
  captureException(error);
};
