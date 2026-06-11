/**
 * IPC handler registration.
 */
import { dialog, ipcMain, shell } from "electron";
import { nanoid } from "nanoid/non-secure";
import path from "node:path";
import {
  getCommands,
  getConfig,
  getShortcuts,
  setCommands,
  setDiagnostics,
  setIconSize,
  setShortcut,
  setWindowSelectionEnabled
} from "../store";
import {
  deleteImage,
  saveCustomIconImage,
  saveIconImage
} from "../utils/image";
import { getMainLogPath, logError } from "../utils/logger";
import {
  ensureBundleIdsInCommands,
  getBundleIdFromApp
} from "../utils/appMetadata";
import {
  getWindowSelectionPermissionStatus,
  getWindowSelectionPermissions,
  getRunningWindows,
  isBlockingPermissionStatus
} from "../windowSelection";
import { activateRunningWindow } from "../windowActivation";
import { IPC_CHANNELS } from "./channels";
import {
  captureUsageEvent,
  configureSentryFromConfig,
  reportError
} from "../utils/sentry";
import type { RunningAppsState } from "../runningApps";
import type {
  AppCommand,
  Config,
  WindowActivationRequest,
  WindowActivationResult,
  WindowSelectionPermissionCheckResult,
  RunningWindowsResult,
  WindowSelectionToggleResult
} from "../../src/types/app";

type ShortcutPayload = {
  name: keyof Config["shortcuts"];
  command: string;
};

type DiagnosticsPayload = Config["diagnostics"];

type AddAppCommandPayload = {
  path: string;
  name: string;
};

type AddDirectoryPayload = {
  name: string;
};

type SetGroupIconPayload = {
  id: string;
};

type AddCommandResult = {
  warning?: string;
  error?: string;
  logPath?: string;
};

type IpcDependencies = {
  openConfig: () => void;
  closeConfig: () => void;
  toggleRing: () => void;
  handleRingOpened: () => void;
  handleRingClosed: () => void;
  requestRingClose: () => void;
  notifyConfigUpdated: () => void;
  getRunningAppsState: () => RunningAppsState;
};

/**
 * Register IPC handlers for the main process.
 */
export const registerIpcHandlers = ({
  openConfig,
  closeConfig,
  toggleRing,
  handleRingOpened,
  handleRingClosed,
  requestRingClose,
  notifyConfigUpdated,
  getRunningAppsState
}: IpcDependencies) => {
  ipcMain.on(IPC_CHANNELS.ringToggle, () => {
    toggleRing();
  });

  ipcMain.on(IPC_CHANNELS.ringOpened, () => {
    captureUsageEvent("ring_opened");
    handleRingOpened();
  });

  ipcMain.on(IPC_CHANNELS.ringClosed, () => {
    captureUsageEvent("ring_closed");
    handleRingClosed();
  });

  ipcMain.on(IPC_CHANNELS.configOpen, () => {
    captureUsageEvent("config_opened");
    openConfig();
  });

  ipcMain.on(IPC_CHANNELS.configClose, () => {
    captureUsageEvent("config_closed");
    closeConfig();
  });

  ipcMain.handle(IPC_CHANNELS.getConfig, () => {
    return getConfig();
  });

  ipcMain.handle(IPC_CHANNELS.getShortcuts, () => {
    return getShortcuts();
  });

  ipcMain.handle(IPC_CHANNELS.setShortcuts, (_, payload: ShortcutPayload) => {
    setShortcut(payload);
    captureUsageEvent("shortcut_changed", {
      shortcut_name: payload.name
    });
    notifyConfigUpdated();
  });

  ipcMain.handle(IPC_CHANNELS.setIconSize, (_, payload: number) => {
    setIconSize(payload);
    captureUsageEvent("icon_size_changed", {
      icon_size: payload
    });
    notifyConfigUpdated();
  });

  ipcMain.handle(
    IPC_CHANNELS.setWindowSelectionEnabled,
    async (_, enabled: boolean): Promise<WindowSelectionToggleResult> => {
      if (!enabled) {
        setWindowSelectionEnabled(false);
        notifyConfigUpdated();
        return {
          enabled: false,
          status: getWindowSelectionPermissionStatus()
        };
      }

      const logPath = getMainLogPath();
      try {
        const permissions = getWindowSelectionPermissions();
        const status = getWindowSelectionPermissionStatus();
        if (!permissions.granted) {
          return {
            enabled: false,
            status,
            permissions: permissions.permissions,
            error:
              "ウィンドウ選択機能に必要な権限が許可されていません",
            logPath
          };
        }

        setWindowSelectionEnabled(true);
        notifyConfigUpdated();
        return {
          enabled: true,
          status
        };
      } catch (error) {
        logError(
          "windowSelection",
          "Failed to enable window selection",
          error
        );
        return {
          enabled: false,
          status: "unknown",
          error: "ウィンドウ選択機能の有効化に失敗しました",
          logPath
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.setDiagnostics,
    async (_, payload: DiagnosticsPayload) => {
      setDiagnostics(payload);
      await configureSentryFromConfig();
      captureUsageEvent("diagnostics_enabled");
      notifyConfigUpdated();
    }
  );

  ipcMain.handle(IPC_CHANNELS.getCommands, () => {
    return getCommands();
  });

  ipcMain.handle(IPC_CHANNELS.getRunningApps, () => {
    return getRunningAppsState();
  });

  ipcMain.handle(
    IPC_CHANNELS.getWindowSelectionPermissions,
    (): WindowSelectionPermissionCheckResult => {
      return getWindowSelectionPermissions();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.getRunningWindows,
    async (): Promise<RunningWindowsResult> => {
      const logPath = getMainLogPath();
      try {
        const permissions = getWindowSelectionPermissions();
        if (!permissions.granted) {
          return {
            windows: [],
            status: getWindowSelectionPermissionStatus(),
            error:
              "ウィンドウ一覧を表示するには権限が必要です。macOS のシステム設定から許可してください",
            logPath
          };
        }
        const result = await getRunningWindows();
        if (isBlockingPermissionStatus(result.status)) {
          return {
            windows: [],
            status: result.status,
            error:
              "ウィンドウ一覧を表示するには画面収録の権限が必要です。macOS のシステム設定から許可してください",
            logPath
          };
        }
        return result;
      } catch (error) {
        logError("windowSelection", "Failed to get running windows", error);
        return {
          windows: [],
          status: "unknown",
          error: "ウィンドウ一覧の取得に失敗しました",
          logPath
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.focusRunningWindow,
    async (_, payload: WindowActivationRequest): Promise<WindowActivationResult> => {
      const logPath = getMainLogPath();
      try {
        const result = await activateRunningWindow(payload);
        if (result.focused || (result.activated && !result.error)) {
          requestRingClose();
        }
        return result.error ? { ...result, logPath } : result;
      } catch (error) {
        logError("windowActivation", "Failed to focus running window", error);
        return {
          activated: false,
          focused: false,
          status: "activation-failed",
          error: "ウィンドウの前面化に失敗しました",
          logPath
        };
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.setCommands, async (_, payload: AppCommand[]) => {
    const { commands } = await ensureBundleIdsInCommands(payload);
    setCommands(commands);
    captureUsageEvent("commands_updated", {
      command_count: commands.length
    });
    notifyConfigUpdated();
  });

  ipcMain.handle(
    IPC_CHANNELS.addAppCommand,
    async (_, file: AddAppCommandPayload) => {
      const id = nanoid();
      let warning: string | undefined;
      const logPath = getMainLogPath();

      try {
        await saveIconImage(id, file.path);
      } catch {
        warning = "アプリアイコンの取得に失敗したため、代替アイコンで追加しました";
      }

      try {
        const bundleId = await getBundleIdFromApp(file.path);

        setCommands([
          ...getCommands(),
          {
            id,
            type: "command",
            name: file.name.replace(".app", ""),
            command: file.path,
            bundleId
          }
        ]);
        captureUsageEvent("application_added", {
          source: "drag-and-drop"
        });
        notifyConfigUpdated();

        return warning
          ? ({ warning, logPath } satisfies AddCommandResult)
          : undefined;
      } catch (error) {
        reportError(error);
        logError("addAppCommand", "Failed to add application command", error, {
          appPath: file.path
        });
        return {
          error: "アプリの追加に失敗しました",
          logPath
        } satisfies AddCommandResult;
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.addApplication, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Application", extensions: ["app"] }]
    });

    if (canceled || !filePaths) {
      return;
    }

    const filePath = filePaths[0];
    const name = path.basename(filePath);
    const id = nanoid();
    let warning: string | undefined;
    const logPath = getMainLogPath();

    try {
      await saveIconImage(id, filePath);
    } catch {
      warning =
        "アプリアイコンの取得に失敗したため、代替アイコンで追加しました";
    }

    try {
      const bundleId = await getBundleIdFromApp(filePath);

      setCommands([
        ...getCommands(),
        {
          id,
          type: "command",
          name: name.replace(".app", ""),
          command: filePath,
          bundleId
        }
      ]);
      captureUsageEvent("application_added", {
        source: "dialog"
      });
      notifyConfigUpdated();

      return warning
        ? ({ warning, logPath } satisfies AddCommandResult)
        : undefined;
    } catch (error) {
      reportError(error);
      logError("addApplication", "Failed to add application", error, {
        appPath: filePath
      });
      return {
        error: "アプリの追加に失敗しました",
        logPath
      } satisfies AddCommandResult;
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.addDirectory,
    async (_, { name }: AddDirectoryPayload) => {
      setCommands([
        ...getCommands(),
        {
          id: nanoid(),
          type: "group",
          name,
          command: ""
        }
      ]);
      captureUsageEvent("group_added");
      notifyConfigUpdated();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.setGroupIcon,
    async (_, { id }: SetGroupIconPayload) => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "svg"]
          }
        ]
      });

      if (canceled || !filePaths?.length) {
        return { canceled: true };
      }

      try {
        await saveCustomIconImage(id, filePaths[0]);
        captureUsageEvent("group_icon_changed");
        return { updatedAt: Date.now() };
      } catch (error) {
        reportError(error);
        logError("image", "Failed to save group icon", error, {
          imagePath: filePaths[0],
          id
        });
        return { error: "アイコン画像の保存に失敗しました" };
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.removeCommandImage, (_, id: string) => {
    const result = deleteImage(id);
    captureUsageEvent("group_icon_removed");
    return result;
  });

  ipcMain.on(IPC_CHANNELS.openPath, (_, targetPath: string) => {
    if (targetPath) {
      captureUsageEvent("command_opened");
      requestRingClose();
      shell.openPath(targetPath);
    }
  });
};
