/**
 * Window selection helpers for listing windows and checking permissions.
 */
import { desktopCapturer, systemPreferences } from "electron";
import type {
  RunningWindow,
  RunningWindowsResult,
  WindowSelectionPermissionCheckResult,
  WindowSelectionPermissionStatus
} from "../src/types/app";
import { runWindowNativeHelper } from "./windowNativeHelper";

const NO_THUMBNAIL_SIZE = { width: 0, height: 0 };
const PERMISSION_PRIME_THUMBNAIL_SIZE = { width: 1, height: 1 };

type NativeWindowListResponse = {
  windows: RunningWindow[];
};

/**
 * Convert Electron's platform media status into the shared renderer type.
 */
export const getWindowSelectionPermissionStatus =
  (): WindowSelectionPermissionStatus => {
    if (process.platform !== "darwin") {
      return "granted";
    }
    return systemPreferences.getMediaAccessStatus("screen");
  };

/**
 * Check whether the current process is trusted for macOS Accessibility.
 */
export const getAccessibilityPermissionStatus =
  (): WindowSelectionPermissionStatus => {
    if (process.platform !== "darwin") {
      return "granted";
    }
    return systemPreferences.isTrustedAccessibilityClient(false)
      ? "granted"
      : "denied";
  };

/**
 * Check whether a media permission status should prevent enabling the feature.
 */
export const isBlockingPermissionStatus = (
  status: WindowSelectionPermissionStatus
) => {
  return status === "denied" || status === "restricted";
};

/**
 * Check required permissions without showing macOS system prompts.
 *
 * macOS TCC evaluates the currently running Electron process. During pnpm dev,
 * that can differ from the packaged RoundDrop.app identity the user approved.
 *
 * Accessibility is gated here because the feature lists windows and then raises
 * the selected window through the native activation helper.
 */
export const getWindowSelectionPermissions =
  (): WindowSelectionPermissionCheckResult => {
    const screenRecordingStatus = getWindowSelectionPermissionStatus();
    const screenRecordingGranted = screenRecordingStatus === "granted";
    const accessibilityStatus = getAccessibilityPermissionStatus();
    const accessibilityGranted = accessibilityStatus === "granted";
    const permissions = [
      {
        name: "screen-recording" as const,
        label: "画面収録",
        granted: screenRecordingGranted,
        status: screenRecordingStatus
      },
      {
        name: "accessibility" as const,
        label: "アクセシビリティ",
        granted: accessibilityGranted,
        status: accessibilityStatus
      }
    ];

    return {
      granted: permissions.every((permission) => permission.granted),
      permissions
    };
  };

/**
 * Touch the protected macOS APIs so TCC can register RoundDrop in System Settings.
 *
 * Screen Recording has no askForMediaAccess equivalent, so a tiny capturer read is
 * used only when the permission is missing. Accessibility is prompted through the
 * Electron wrapper around AXIsProcessTrustedWithOptions.
 */
export const primeWindowSelectionPermissions =
  async (): Promise<WindowSelectionPermissionCheckResult> => {
    const permissions = getWindowSelectionPermissions();
    if (process.platform !== "darwin" || permissions.granted) {
      return permissions;
    }

    const needsScreenRecording = permissions.permissions.some(
      (permission) =>
        permission.name === "screen-recording" && !permission.granted
    );
    const needsAccessibility = permissions.permissions.some(
      (permission) => permission.name === "accessibility" && !permission.granted
    );

    if (needsScreenRecording) {
      try {
        await desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: PERMISSION_PRIME_THUMBNAIL_SIZE,
          fetchWindowIcons: false
        });
      } catch {
        // Permission denial is reflected by the follow-up status check below.
      }
    }

    if (needsAccessibility) {
      systemPreferences.isTrustedAccessibilityClient(true);
    }

    return getWindowSelectionPermissions();
  };

/**
 * Convert a capturer source into the renderer-safe window shape.
 */
const toRunningWindow = (
  source: Electron.DesktopCapturerSource
): RunningWindow => {
  const appIcon =
    source.appIcon && !source.appIcon.isEmpty()
      ? source.appIcon.toDataURL()
      : undefined;

  return {
    id: source.id,
    title: source.name.trim() || "名称未設定のウィンドウ",
    appIcon
  };
};

/**
 * Read currently available desktop capturer window sources.
 *
 * This is used as a non-macOS fallback because the macOS native helper can
 * enumerate windows across Spaces.
 */
const getDesktopCapturerWindows = async (): Promise<RunningWindowsResult> => {
  const sources = await desktopCapturer.getSources({
    types: ["window"],
    thumbnailSize: NO_THUMBNAIL_SIZE,
    fetchWindowIcons: true
  });

  return {
    windows: sources.map(toRunningWindow),
    status: getWindowSelectionPermissionStatus()
  };
};

/**
 * Convert native helper output into a running windows result.
 */
const parseNativeWindowList = (stdout: string): RunningWindowsResult => {
  const result = JSON.parse(stdout.trim()) as NativeWindowListResponse;
  return {
    windows: result.windows,
    status: getWindowSelectionPermissionStatus()
  };
};

/**
 * Read macOS windows across Spaces through the native helper.
 */
const getNativeRunningWindows = async (): Promise<RunningWindowsResult> => {
  return await runWindowNativeHelper({
    args: ["list"],
    parseStdout: parseNativeWindowList,
    createUnavailableResult: () => ({
      windows: [],
      status: getWindowSelectionPermissionStatus(),
      error: "ウィンドウ一覧ヘルパーが見つかりません"
    }),
    createFailureResult: (message) => ({
      windows: [],
      status: getWindowSelectionPermissionStatus(),
      error: message || "ウィンドウ一覧の取得に失敗しました"
    })
  });
};

/**
 * Read currently available window sources.
 *
 * This intentionally does not resolve or filter by bundleId: the window view
 * lists system-reported window sources, not only applications registered in
 * the RoundDrop launcher.
 */
export const getRunningWindows = async (): Promise<RunningWindowsResult> => {
  if (process.platform === "darwin") {
    return await getNativeRunningWindows();
  }

  return await getDesktopCapturerWindows();
};
