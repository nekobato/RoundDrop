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
  setIconSize,
  setShortcut
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
import { IPC_CHANNELS } from "./channels";
import type { RunningAppsState } from "../runningApps";
import type { AppCommand, Config } from "../../src/types/app";

type ShortcutPayload = {
  name: keyof Config["shortcuts"];
  command: string;
};

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
    handleRingOpened();
  });

  ipcMain.on(IPC_CHANNELS.ringClosed, () => {
    handleRingClosed();
  });

  ipcMain.on(IPC_CHANNELS.configOpen, () => {
    openConfig();
  });

  ipcMain.on(IPC_CHANNELS.configClose, () => {
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
    notifyConfigUpdated();
  });

  ipcMain.handle(IPC_CHANNELS.setIconSize, (_, payload: number) => {
    setIconSize(payload);
    notifyConfigUpdated();
  });
  ipcMain.handle(IPC_CHANNELS.getCommands, () => {
    return getCommands();
  });

  ipcMain.handle(IPC_CHANNELS.getRunningApps, () => {
    return getRunningAppsState();
  });

  ipcMain.handle(IPC_CHANNELS.setCommands, async (_, payload: AppCommand[]) => {
    const { commands } = await ensureBundleIdsInCommands(payload);
    setCommands(commands);
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
        notifyConfigUpdated();

        return warning
          ? ({ warning, logPath } satisfies AddCommandResult)
          : undefined;
      } catch (error) {
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
      notifyConfigUpdated();

      return warning
        ? ({ warning, logPath } satisfies AddCommandResult)
        : undefined;
    } catch (error) {
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
        return { updatedAt: Date.now() };
      } catch (error) {
        logError("image", "Failed to save group icon", error, {
          imagePath: filePaths[0],
          id
        });
        return { error: "アイコン画像の保存に失敗しました" };
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.removeCommandImage, (_, id: string) => {
    return deleteImage(id);
  });

  ipcMain.on(IPC_CHANNELS.openPath, (_, targetPath: string) => {
    if (targetPath) {
      requestRingClose();
      shell.openPath(targetPath);
    }
  });
};
