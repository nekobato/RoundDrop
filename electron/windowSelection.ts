/**
 * Window selection helpers backed by Electron desktopCapturer.
 */
import { desktopCapturer, systemPreferences } from "electron";
import type {
  RunningWindow,
  RunningWindowsResult,
  WindowSelectionPermissionCheckResult,
  WindowSelectionPermissionStatus
} from "../src/types/app";

const NO_THUMBNAIL_SIZE = { width: 0, height: 0 };

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
 * Check whether a media permission status should prevent enabling the feature.
 */
export const isBlockingPermissionStatus = (
  status: WindowSelectionPermissionStatus
) => {
  return status === "denied" || status === "restricted";
};

/**
 * Check required permissions without showing macOS system prompts.
 */
export const getWindowSelectionPermissions =
  (): WindowSelectionPermissionCheckResult => {
    const screenRecordingStatus = getWindowSelectionPermissionStatus();
    const screenRecordingGranted = screenRecordingStatus === "granted";
    const accessibilityGranted =
      process.platform !== "darwin" ||
      systemPreferences.isTrustedAccessibilityClient(false);
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
        granted: accessibilityGranted
      }
    ];

    return {
      granted: permissions.every((permission) => permission.granted),
      permissions
    };
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
 * Read currently available window sources without collecting thumbnails.
 *
 * This intentionally does not resolve or filter by bundleId: the window view
 * lists Electron-reported window sources, not only applications registered in
 * the RoundDrop launcher.
 */
export const getRunningWindows = async (): Promise<RunningWindowsResult> => {
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
