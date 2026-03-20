/**
 * Window controller for launcher and config windows.
 */
import { BrowserWindow, screen } from "electron";
import path from "node:path";
import { IPC_CHANNELS } from "../ipc/channels";
import * as statics from "../static";
import type { Config } from "../../src/types/app";

type WindowControllerDeps = {
  getConfig: () => Config;
  isQuitting: () => boolean;
  registerGlobalShortcut: () => void;
  unregisterAllShortcuts: () => void;
};

export type WindowController = {
  createLauncherWindow: () => BrowserWindow;
  openConfigWindow: () => void;
  closeConfigWindow: () => void;
  toggleRing: () => void;
  handleRingOpened: () => void;
  handleRingClosed: () => void;
  requestRingClose: () => void;
  setLauncherWindowPosition: () => void;
  getLauncherWindow: () => BrowserWindow | null;
  getConfigWindow: () => BrowserWindow | null;
  clearLauncherWindow: () => void;
};

/**
 * Create a window controller for the main process.
 */
export const createWindowController = ({
  getConfig,
  isQuitting,
  registerGlobalShortcut,
  unregisterAllShortcuts
}: WindowControllerDeps): WindowController => {
  let launcherWindow: BrowserWindow | null = null;
  let configWindow: BrowserWindow | null = null;
  let isRingVisible = false;
  let isRingAnimating = false;

  /**
   * Get the launcher window instance.
   */
  const getLauncherWindow = () => launcherWindow;

  /**
   * Get the config window instance.
   */
  const getConfigWindow = () => configWindow;

  /**
   * Check whether a BrowserWindow instance is still usable.
   */
  const isWindowAlive = (
    window: BrowserWindow | null
  ): window is BrowserWindow => {
    return window !== null && !window.isDestroyed();
  };

  /**
   * Set the launcher window bounds to the current display's work area.
   */
  const setLauncherWindowPosition = () => {
    if (!isWindowAlive(launcherWindow)) {
      return;
    }

    const { x, y } = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint({ x, y });
    const { workArea } = display;

    launcherWindow.setBounds({
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height
    });
  };

  /**
   * Load the renderer content for a given window type.
   */
  const loadRenderer = (target: BrowserWindow, windowType: "main" | "config") => {
    if (statics.VITE_DEV_SERVER_URL) {
      const url =
        windowType === "config"
          ? `${statics.pageRoot}?window=config`
          : statics.pageRoot;
      target.loadURL(url);
      return;
    }

    if (windowType === "config") {
      target.loadFile(statics.pageRoot, { query: { window: "config" } });
      return;
    }

    target.loadFile(statics.pageRoot);
  };

  /**
   * Reset ring visibility/animation flags.
   */
  const resetRingState = () => {
    isRingVisible = false;
    isRingAnimating = false;
  };

  /**
   * Restore the launcher window after closing the config window.
   */
  const restoreLauncherWindow = () => {
    resetRingState();

    if (!isWindowAlive(launcherWindow)) {
      return;
    }

    setLauncherWindowPosition();
    launcherWindow.setIgnoreMouseEvents(true);
    launcherWindow.setVisibleOnAllWorkspaces(true);
    launcherWindow.setAlwaysOnTop(true);
    launcherWindow.blur();

    const config = getConfig();
    if (config.commands.length !== 0) {
      registerGlobalShortcut();
    }
  };

  /**
   * Create the launcher window.
   */
  const createLauncherWindow = () => {
    launcherWindow = new BrowserWindow({
      icon: path.join(statics.publicRoot, "icon.png"),
      webPreferences: {
        preload: statics.preload,
        devTools: Boolean(statics.VITE_DEV_SERVER_URL)
      },
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      show: false,
      roundedCorners: false,
      hasShadow: false
    });

    setLauncherWindowPosition();
    launcherWindow.setVisibleOnAllWorkspaces(true);
    launcherWindow.on("closed", () => {
      launcherWindow = null;
    });

    launcherWindow.webContents.on("did-finish-load", () => {
      launcherWindow?.webContents.send(
        IPC_CHANNELS.mainProcessMessage,
        new Date().toLocaleString()
      );
    });

    loadRenderer(launcherWindow, "main");
    launcherWindow.setIgnoreMouseEvents(true);
    if (statics.VITE_DEV_SERVER_URL) {
      launcherWindow.webContents.openDevTools({ mode: "detach" });
    }

    return launcherWindow;
  };

  /**
   * Open the config window, creating it when needed.
   */
  const openConfigWindow = () => {
    if (configWindow && !configWindow.isDestroyed()) {
      configWindow.show();
      configWindow.focus();
      return;
    }

    resetRingState();
    requestRingClose();
    if (isWindowAlive(launcherWindow)) {
      launcherWindow.hide();
      launcherWindow.setIgnoreMouseEvents(true);
      launcherWindow.setVisibleOnAllWorkspaces(true);
      launcherWindow.setAlwaysOnTop(true);
    }
    unregisterAllShortcuts();

    configWindow = new BrowserWindow({
      width: 680,
      height: 480,
      icon: path.join(statics.publicRoot, "icon.png"),
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      webPreferences: {
        preload: statics.preload,
        devTools: Boolean(statics.VITE_DEV_SERVER_URL)
      }
    });

    configWindow.on("closed", () => {
      const shouldRestoreLauncher = !isQuitting();
      configWindow = null;
      if (shouldRestoreLauncher) {
        restoreLauncherWindow();
      } else {
        resetRingState();
      }
    });

    loadRenderer(configWindow, "config");

    configWindow.once("ready-to-show", () => {
      configWindow?.show();
      configWindow?.focus();
    });
  };

  /**
   * Close the config window and restore launcher state.
   */
  const closeConfigWindow = () => {
    if (isWindowAlive(configWindow)) {
      configWindow.close();
      return;
    }

    if (isQuitting()) {
      resetRingState();
      return;
    }

    restoreLauncherWindow();
  };

  /**
   * Send a ring close request to the renderer.
   */
  const requestRingClose = () => {
    if (isWindowAlive(launcherWindow)) {
      launcherWindow.webContents.send(IPC_CHANNELS.ringClose);
    }
    isRingVisible = false;
  };

  /**
   * Toggle the ring visibility.
   */
  const toggleRing = () => {
    if (configWindow && !configWindow.isDestroyed()) {
      return;
    }
    if (isRingAnimating) {
      return;
    }
    isRingAnimating = true;
    if (isRingVisible) {
      requestRingClose();
      return;
    }

    setLauncherWindowPosition();
    if (!isWindowAlive(launcherWindow)) {
      isRingAnimating = false;
      return;
    }

    launcherWindow.webContents.send(IPC_CHANNELS.ringOpen);
    isRingVisible = true;
    launcherWindow.show();
  };

  /**
   * Apply window changes when the ring has fully opened.
   */
  const handleRingOpened = () => {
    if (isWindowAlive(launcherWindow)) {
      launcherWindow.setIgnoreMouseEvents(false);
      launcherWindow.focus();
    }
    isRingAnimating = false;
  };

  /**
   * Apply window changes when the ring has fully closed.
   */
  const handleRingClosed = () => {
    if (isWindowAlive(launcherWindow)) {
      launcherWindow.setIgnoreMouseEvents(true);
      launcherWindow.blur();
      launcherWindow.hide();
    }
    isRingAnimating = false;
  };

  /**
   * Clear the launcher window reference.
   */
  const clearLauncherWindow = () => {
    launcherWindow = null;
  };

  return {
    createLauncherWindow,
    openConfigWindow,
    closeConfigWindow,
    toggleRing,
    handleRingOpened,
    handleRingClosed,
    requestRingClose,
    setLauncherWindowPosition,
    getLauncherWindow,
    getConfigWindow,
    clearLauncherWindow
  };
};
