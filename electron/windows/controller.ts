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
   * Set the launcher window bounds to the current display's work area.
   */
  const setLauncherWindowPosition = () => {
    const { x, y } = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint({ x, y });
    const { workArea } = display;

    launcherWindow?.setBounds({
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
    launcherWindow?.hide();
    launcherWindow?.setIgnoreMouseEvents(true);
    launcherWindow?.setVisibleOnAllWorkspaces(true);
    launcherWindow?.setAlwaysOnTop(true);
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
      configWindow = null;
      closeConfigWindow();
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
    if (configWindow && !configWindow.isDestroyed()) {
      configWindow.close();
      return;
    }

    resetRingState();
    setLauncherWindowPosition();
    launcherWindow?.setIgnoreMouseEvents(true);
    launcherWindow?.setVisibleOnAllWorkspaces(true);
    launcherWindow?.setAlwaysOnTop(true);
    launcherWindow?.blur();

    const config = getConfig();
    if (config.commands.length !== 0) {
      registerGlobalShortcut();
    }
  };

  /**
   * Send a ring close request to the renderer.
   */
  const requestRingClose = () => {
    launcherWindow?.webContents.send(IPC_CHANNELS.ringClose);
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
    launcherWindow?.webContents.send(IPC_CHANNELS.ringOpen);
    isRingVisible = true;
    launcherWindow?.show();
  };

  /**
   * Apply window changes when the ring has fully opened.
   */
  const handleRingOpened = () => {
    launcherWindow?.setIgnoreMouseEvents(false);
    launcherWindow?.focus();
    isRingAnimating = false;
  };

  /**
   * Apply window changes when the ring has fully closed.
   */
  const handleRingClosed = () => {
    launcherWindow?.setIgnoreMouseEvents(true);
    launcherWindow?.blur();
    launcherWindow?.hide();
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
