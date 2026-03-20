import { app } from "electron";
import log from "electron-log";

type ProcessError = NodeJS.ErrnoException & {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
  spawnargs?: string[];
};

let configured = false;

const toText = (value?: string | Buffer) => {
  if (typeof value === "string") {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }
  return undefined;
};

export const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
};

export const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    const processError = error as ProcessError;
    return {
      name: processError.name,
      message: processError.message,
      stack: processError.stack,
      code: processError.code,
      errno: processError.errno,
      syscall: processError.syscall,
      path: processError.path,
      spawnargs: processError.spawnargs,
      stdout: toText(processError.stdout),
      stderr: toText(processError.stderr)
    };
  }

  return {
    value: String(error)
  };
};

export const getLogger = () => {
  if (!configured) {
    log.transports.file.level = "info";
    log.transports.console.level = app.isPackaged ? false : "debug";
    configured = true;
  }

  return log;
};

export const getMainLogPath = () => {
  return getLogger().transports.file.getFile().path;
};

export const logError = (
  scope: string,
  message: string,
  error: unknown,
  context?: Record<string, unknown>
) => {
  getLogger().error(`[${scope}] ${message}`, {
    ...(context ?? {}),
    error: serializeError(error)
  });
};
