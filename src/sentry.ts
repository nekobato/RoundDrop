import * as Sentry from "@sentry/electron/renderer";

const parseSampleRate = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(Math.max(parsed, 0), 1);
};

const SENTRY_TRACES_SAMPLE_RATE = parseSampleRate(
  import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE
);

let initialized = false;
let diagnosticsEnabled = false;

const hasSentryDsn = () => {
  return Boolean(import.meta.env.VITE_SENTRY_DSN?.trim());
};

const redactString = (value: string) => {
  return value
    .replace(/file:\/\/\/Users\/[^/]+/g, "file:///Users/[redacted]")
    .replace(/\/Users\/[^/]+/g, "/Users/[redacted]");
};

const redactValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>(
      (acc, [key, item]) => {
        acc[key] = /^(appPath|bundleId|command|filePath|imagePath|path)$/i.test(
          key
        )
          ? "[redacted]"
          : redactValue(item);
        return acc;
      },
      {}
    );
  }

  return value;
};

const scrubEvent = (event: Sentry.ErrorEvent) => {
  if (!diagnosticsEnabled) {
    return null;
  }

  return redactValue({
    ...event,
    request: event.request ? redactValue(event.request) : undefined,
    user: undefined
  }) as Sentry.ErrorEvent;
};

const closeRendererClient = async () => {
  if (!initialized) {
    return;
  }

  await Sentry.getClient()?.close(2000);
  initialized = false;
};

export const configureSentry = async (enabled: boolean) => {
  diagnosticsEnabled = enabled;

  if (!enabled || !hasSentryDsn()) {
    await closeRendererClient();
    return;
  }

  if (initialized) {
    return;
  }

  Sentry.init({
    sendDefaultPii: false,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    beforeSend: scrubEvent,
    initialScope: {
      tags: {
        app: "round-drop",
        process: "renderer"
      }
    }
  });

  initialized = true;
};
