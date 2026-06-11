/**
 * macOS window activation helpers backed by a native Swift helper.
 */
import { app } from "electron";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  WindowActivationRequest,
  WindowActivationResult
} from "../src/types/app";

const HELPER_TIMEOUT_MS = 5000;
const HELPER_BINARY_NAME = "rounddrop-window-activator";
const SWIFT_SOURCE_PATH = path.join(
  process.cwd(),
  "native/window-activator/WindowActivator.swift"
);

type HelperInvocation = {
  command: string;
  args: string[];
};

/**
 * Validate Electron desktopCapturer window source ids before invoking native code.
 */
export const parseWindowSourceId = (sourceId: string) => {
  const match = /^window:(\d+):\d+$/.exec(sourceId);
  return match ? Number(match[1]) : undefined;
};

/**
 * Resolve the native helper invocation for packaged and development builds.
 */
const createHelperInvocation = (sourceId: string): HelperInvocation | undefined => {
  const packagedHelperPath = path.join(
    process.resourcesPath,
    "native",
    HELPER_BINARY_NAME
  );
  if (app.isPackaged && existsSync(packagedHelperPath)) {
    return {
      command: packagedHelperPath,
      args: ["activate", sourceId]
    };
  }

  if (app.isPackaged) {
    return undefined;
  }

  const developmentHelperPath = path.join(
    process.cwd(),
    "build/native",
    HELPER_BINARY_NAME
  );
  if (existsSync(developmentHelperPath)) {
    return {
      command: developmentHelperPath,
      args: ["activate", sourceId]
    };
  }

  if (!existsSync(SWIFT_SOURCE_PATH)) {
    return undefined;
  }

  return {
    command: "/usr/bin/swift",
    args: [SWIFT_SOURCE_PATH, "activate", sourceId]
  };
};

/**
 * Convert helper output into a typed activation result.
 */
const parseHelperOutput = (stdout: string): WindowActivationResult => {
  return JSON.parse(stdout.trim()) as WindowActivationResult;
};

/**
 * Execute the native helper and preserve structured failure details.
 */
const runActivationHelper = async (
  sourceId: string
): Promise<WindowActivationResult> => {
  const invocation = createHelperInvocation(sourceId);
  if (!invocation) {
    return {
      activated: false,
      focused: false,
      status: "helper-unavailable",
      error: "Window activation helper was not found"
    };
  }

  return await new Promise((resolve) => {
    execFile(
      invocation.command,
      invocation.args,
      { timeout: HELPER_TIMEOUT_MS },
      (error, stdout, stderr) => {
        try {
          const result = parseHelperOutput(stdout);
          resolve(result);
          return;
        } catch {
          resolve({
            activated: false,
            focused: false,
            status: "activation-failed",
            error:
              stderr.trim() ||
              (error instanceof Error
                ? error.message
                : "Window activation failed")
          });
        }
      }
    );
  });
};

/**
 * Activate and raise a desktopCapturer window source through macOS native APIs.
 */
export const activateRunningWindow = async ({
  id
}: WindowActivationRequest): Promise<WindowActivationResult> => {
  if (process.platform !== "darwin") {
    return {
      activated: false,
      focused: false,
      status: "unsupported-platform",
      error: "Window activation is only supported on macOS"
    };
  }

  if (typeof parseWindowSourceId(id) !== "number") {
    return {
      activated: false,
      focused: false,
      status: "invalid-window-id",
      error: "Invalid desktop capturer window id"
    };
  }

  return await runActivationHelper(id);
};
