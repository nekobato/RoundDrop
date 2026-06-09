import * as Sentry from "@sentry/electron/main";
import { app } from "electron";
import { getConfig } from "../store";

type UsageEventName =
  | "app_started"
  | "diagnostics_enabled"
  | "ring_opened"
  | "ring_closed"
  | "config_opened"
  | "config_closed"
  | "shortcut_changed"
  | "icon_size_changed"
  | "commands_updated"
  | "application_added"
  | "group_added"
  | "group_icon_changed"
  | "group_icon_removed"
  | "command_opened";

type UsageTags = Record<string, string | number | boolean | undefined>;
type UsageExtra = Record<string, unknown>;
type ConfigureSentryOptions = {
  trackStartup?: boolean;
};

const firstNonEmpty = (...values: Array<string | undefined>) => {
  return values.find((value) => value && value.trim().length > 0)?.trim() ?? "";
};

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

const SENTRY_DSN = firstNonEmpty(
  import.meta.env.VITE_SENTRY_DSN,
  process.env.SENTRY_DSN
);

const SENTRY_ENVIRONMENT = firstNonEmpty(
  import.meta.env.VITE_SENTRY_ENVIRONMENT,
  process.env.SENTRY_ENVIRONMENT,
  process.env.NODE_ENV,
  app.isPackaged ? "production" : "development"
);

const SENTRY_TRACES_SAMPLE_RATE = parseSampleRate(
  firstNonEmpty(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
    process.env.SENTRY_TRACES_SAMPLE_RATE
  )
);

let initialized = false;

const isDiagnosticsEnabled = () => getConfig().diagnostics.enabled;

const hasSentryDsn = () => SENTRY_DSN.length > 0;

const createReleaseName = () => `round-drop@${app.getVersion()}`;

const sensitiveKeyPattern =
  /^(appPath|bundleId|command|filePath|imagePath|path|targetPath)$/i;

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
        acc[key] = sensitiveKeyPattern.test(key)
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
  if (!isDiagnosticsEnabled()) {
    return null;
  }

  return redactValue({
    ...event,
    request: event.request ? redactValue(event.request) : undefined,
    user: undefined
  }) as Sentry.ErrorEvent;
};

const toSentryTags = (tags: UsageTags) => {
  return Object.entries(tags).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value === undefined) {
        return acc;
      }

      acc[key] = redactString(String(value)).slice(0, 200);
      return acc;
    },
    {}
  );
};

export const isSentryActive = () => {
  return initialized && hasSentryDsn() && isDiagnosticsEnabled();
};

export const initSentry = () => {
  void configureSentryFromConfig({ trackStartup: true });
};

export const configureSentryFromConfig = async (
  options: ConfigureSentryOptions = {}
) => {
  const shouldEnable = hasSentryDsn() && isDiagnosticsEnabled();

  if (!shouldEnable) {
    if (initialized) {
      await Sentry.close(2000);
      initialized = false;
    }
    return;
  }

  if (initialized) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    release: createReleaseName(),
    environment: SENTRY_ENVIRONMENT,
    sendDefaultPii: false,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    attachScreenshot: false,
    beforeSend: scrubEvent,
    initialScope: {
      tags: {
        app: "round-drop",
        process: "main"
      }
    }
  });

  initialized = true;
  if (options.trackStartup) {
    captureUsageEvent("app_started");
  }
};

export const captureUsageEvent = (
  name: UsageEventName,
  tags: UsageTags = {},
  extra: UsageExtra = {}
) => {
  if (!isSentryActive()) {
    return;
  }

  Sentry.captureEvent({
    message: `usage.${name}`,
    level: "info",
    tags: toSentryTags({
      event_name: name,
      event_type: "usage",
      ...tags
    }),
    extra: redactValue(extra) as UsageExtra
  });
};

export const reportError = (error: unknown) => {
  if (!isSentryActive()) {
    return;
  }

  Sentry.captureException(error);
};
