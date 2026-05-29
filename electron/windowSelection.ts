/**
 * Window selection helpers backed by Electron desktopCapturer.
 */
import { desktopCapturer, systemPreferences } from "electron";
import type {
  RunningWindow,
  RunningWindowsResult,
  WindowSelectionPermissionStatus
} from "../src/types/app";

const NO_THUMBNAIL_SIZE = { width: 0, height: 0 };
const PERMISSION_PROBE_THUMBNAIL_SIZE = { width: 1, height: 1 };

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

/**
 * Probe desktopCapturer once so macOS can present the screen capture prompt.
 */
export const requestWindowSelectionPermission = async () => {
  await desktopCapturer.getSources({
    types: ["window"],
    thumbnailSize: PERMISSION_PROBE_THUMBNAIL_SIZE,
    fetchWindowIcons: true
  });
  return getWindowSelectionPermissionStatus();
};
