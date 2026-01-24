/**
 * Electron main process entry point.
 */
import { BrowserWindow, app } from "electron";
import path from "node:path";
import { IPC_CHANNELS } from "./ipc/channels";
import { registerIpcHandlers } from "./ipc/handlers";
import { setMenu } from "./menu";
import { registerImageProtocol, registerImageScheme } from "./protocols/image";
import {
  registerToggleShortcut,
  unregisterAllShortcuts
} from "./shortcuts";
import { createWindowController } from "./windows/controller";
import { getCommands, getConfig, getShortcuts, setCommands } from "./store";
import { ensureBundleIdsInCommands } from "./utils/appMetadata";
import { checkUpdate } from "./utils/autoupdate";
import { initSentry } from "./utils/sentry";
import {
  createRunningAppsWatcher,
  type RunningAppsState
} from "./runningApps";

initSentry();

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let runningAppsState: RunningAppsState = {};

/**
 * Register the global shortcut for toggling the ring.
 */
const registerGlobalShortcut = () => {
  const shortcuts = getShortcuts();
  registerToggleShortcut(shortcuts.toggleCommand, windowController.toggleRing);
};

const windowController = createWindowController({
  getConfig,
  registerGlobalShortcut,
  unregisterAllShortcuts
});

const runningAppsWatcher = createRunningAppsWatcher({
  getCommands,
  onUpdate: (state) => {
    runningAppsState = state;
    windowController
      .getLauncherWindow()
      ?.webContents.send(IPC_CHANNELS.runningAppsUpdate, state);
  }
});

/**
 * Notify renderer windows that config values have changed.
 */
const notifyConfigUpdated = () => {
  windowController
    .getLauncherWindow()
    ?.webContents.send(IPC_CHANNELS.configUpdated);
  windowController
    .getConfigWindow()
    ?.webContents.send(IPC_CHANNELS.configUpdated);
};

/**
 * Handle the "window-all-closed" app event.
 */
const handleAllWindowsClosed = () => {
  if (process.platform !== "darwin") {
    app.quit();
    windowController.clearLauncherWindow();
  }
};

/**
 * Handle the "activate" app event.
 */
const handleActivate = () => {
  const configWindow = windowController.getConfigWindow();
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.show();
    configWindow.focus();
    return;
  }

  if (BrowserWindow.getAllWindows().length === 0) {
    windowController.createLauncherWindow();
  } else {
    windowController.toggleRing();
  }
};

/**
 * Handle the "will-quit" app event.
 */
const handleWillQuit = () => {
  unregisterAllShortcuts();
  runningAppsWatcher.stop();
};

/**
 * Initialize app after Electron is ready.
 */
const initializeApp = async () => {
  const aboutIconPath = path.join(
    __dirname,
    "../public/icons/png/128x128.png"
  );

  setMenu({ openConfig: windowController.openConfigWindow, aboutIconPath });
  windowController.createLauncherWindow();

  const config = getConfig();
  if (config.commands.length !== 0) {
    registerGlobalShortcut();
  }

  const { changed, commands } = await ensureBundleIdsInCommands(config.commands);
  if (changed) {
    setCommands(commands);
  }

  runningAppsWatcher.start();

  registerIpcHandlers({
    openConfig: windowController.openConfigWindow,
    closeConfig: windowController.closeConfigWindow,
    toggleRing: windowController.toggleRing,
    handleRingOpened: windowController.handleRingOpened,
    handleRingClosed: windowController.handleRingClosed,
    requestRingClose: windowController.requestRingClose,
    notifyConfigUpdated,
    getRunningAppsState: () => runningAppsState
  });

  registerImageProtocol();
};

registerImageScheme();

app.on("window-all-closed", handleAllWindowsClosed);
app.on("activate", handleActivate);
app.on("will-quit", handleWillQuit);

checkUpdate();

app.whenReady().then(initializeApp);
