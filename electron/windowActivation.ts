/**
 * macOS window activation helpers backed by a native Swift helper.
 */
import type {
  WindowActivationRequest,
  WindowActivationResult
} from "../src/types/app";
import { runWindowNativeHelper } from "./windowNativeHelper";

/**
 * Validate Electron desktopCapturer window source ids before invoking native code.
 */
export const parseWindowSourceId = (sourceId: string) => {
  const match = /^window:(\d+):\d+$/.exec(sourceId);
  return match ? Number(match[1]) : undefined;
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
  return await runWindowNativeHelper({
    args: ["activate", sourceId],
    parseStdout: parseHelperOutput,
    createUnavailableResult: () => ({
      activated: false,
      focused: false,
      status: "helper-unavailable",
      error: "Window activation helper was not found"
    }),
    createFailureResult: (message) => ({
      activated: false,
      focused: false,
      status: "activation-failed",
      error: message || "Window activation failed"
    })
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
