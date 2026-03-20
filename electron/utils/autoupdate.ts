import { app, dialog } from "electron";
import {
  autoUpdater,
  type ProgressInfo,
  type UpdateDownloadedEvent,
  type UpdateInfo
} from "electron-updater";
import { formatError, getLogger } from "./logger";

const INITIAL_UPDATE_CHECK_DELAY_MS = 3_000;
const PERIODIC_UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1_000;

type AutoUpdateManager = {
  start: () => void;
  stop: () => void;
  checkForUpdates: () => Promise<void>;
};

const log = getLogger();

const logUpdateEvent = (message: string, payload?: unknown) => {
  if (payload === undefined) {
    log.info(`[autoUpdater] ${message}`);
    return;
  }

  log.info(`[autoUpdater] ${message}`, payload);
};

export const createAutoUpdateManager = (): AutoUpdateManager => {
  autoUpdater.logger = log;

  let hasStarted = false;
  let initialCheckTimer: NodeJS.Timeout | null = null;
  let periodicCheckTimer: NodeJS.Timeout | null = null;
  let activeCheck: Promise<void> | null = null;
  let isUpdateDialogVisible = false;

  const clearTimer = (timer: NodeJS.Timeout | null) => {
    if (timer) {
      clearTimeout(timer);
    }
    return null;
  };

  const onCheckingForUpdate = () => {
    logUpdateEvent("Checking for updates");
  };

  const onUpdateAvailable = (info: UpdateInfo) => {
    logUpdateEvent(`Update available: ${info.version}`, info);
  };

  const onUpdateNotAvailable = (info: UpdateInfo) => {
    logUpdateEvent(`No updates available. Current feed version: ${info.version}`, info);
  };

  const onDownloadProgress = (info: ProgressInfo) => {
    logUpdateEvent(
      `Download progress: ${info.percent.toFixed(1)}% (${info.transferred}/${info.total})`,
      info
    );
  };

  const onUpdateDownloaded = async (event: UpdateDownloadedEvent) => {
    logUpdateEvent(`Update downloaded: ${event.version}`, event);

    if (isUpdateDialogVisible) {
      return;
    }

    isUpdateDialogVisible = true;

    try {
      const result = await dialog.showMessageBox({
        type: "info",
        buttons: ["再起動して更新", "あとで"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
        title: "アップデートの準備ができました",
        message: `RoundDrop ${event.version} をインストールできます`,
        detail:
          "再起動するとアップデートを適用いたします。\n作業中の内容があれば先に保存してくださいませ。"
      });

      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    } catch (error) {
      log.error("[autoUpdater] Failed to show update dialog", formatError(error));
    } finally {
      isUpdateDialogVisible = false;
    }
  };

  const onUpdateError = (error: Error, message?: string) => {
    const details = message ? `${message}\n${formatError(error)}` : formatError(error);
    log.error("[autoUpdater] Update flow failed", details);
  };

  const attachEventHandlers = () => {
    autoUpdater.on("checking-for-update", onCheckingForUpdate);
    autoUpdater.on("update-available", onUpdateAvailable);
    autoUpdater.on("update-not-available", onUpdateNotAvailable);
    autoUpdater.on("download-progress", onDownloadProgress);
    autoUpdater.on("update-downloaded", onUpdateDownloaded);
    autoUpdater.on("error", onUpdateError);
  };

  const detachEventHandlers = () => {
    autoUpdater.off("checking-for-update", onCheckingForUpdate);
    autoUpdater.off("update-available", onUpdateAvailable);
    autoUpdater.off("update-not-available", onUpdateNotAvailable);
    autoUpdater.off("download-progress", onDownloadProgress);
    autoUpdater.off("update-downloaded", onUpdateDownloaded);
    autoUpdater.off("error", onUpdateError);
  };

  const schedulePeriodicCheck = () => {
    periodicCheckTimer = clearTimer(periodicCheckTimer);

    if (!hasStarted || !app.isPackaged) {
      return;
    }

    periodicCheckTimer = setTimeout(async () => {
      await checkForUpdates();
      schedulePeriodicCheck();
    }, PERIODIC_UPDATE_CHECK_INTERVAL_MS);
  };

  const checkForUpdates = async () => {
    if (!app.isPackaged) {
      logUpdateEvent("Skipping update check because the app is not packaged");
      return;
    }

    if (activeCheck) {
      logUpdateEvent("Skipping duplicate update check because one is already in progress");
      return activeCheck;
    }

    activeCheck = (async () => {
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        log.error("[autoUpdater] Failed to check for updates", formatError(error));
      } finally {
        activeCheck = null;
      }
    })();

    return activeCheck;
  };

  const start = () => {
    if (hasStarted) {
      return;
    }

    hasStarted = true;
    attachEventHandlers();

    if (!app.isPackaged) {
      logUpdateEvent("Updater is disabled because the app is not packaged");
      return;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.autoRunAppAfterInstall = true;

    logUpdateEvent(
      `Scheduling initial update check in ${INITIAL_UPDATE_CHECK_DELAY_MS}ms`
    );

    initialCheckTimer = setTimeout(async () => {
      initialCheckTimer = clearTimer(initialCheckTimer);
      await checkForUpdates();
      schedulePeriodicCheck();
    }, INITIAL_UPDATE_CHECK_DELAY_MS);
  };

  const stop = () => {
    hasStarted = false;
    initialCheckTimer = clearTimer(initialCheckTimer);
    periodicCheckTimer = clearTimer(periodicCheckTimer);
    detachEventHandlers();
  };

  return {
    start,
    stop,
    checkForUpdates
  };
};
