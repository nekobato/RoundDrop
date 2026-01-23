import {
  BrowserWindow,
  app,
  dialog,
  globalShortcut,
  ipcMain,
  shell,
  screen,
  type MenuItem,
  type MenuItemConstructorOptions,
  protocol,
  net
} from "electron";
import { nanoid } from "nanoid/non-secure";
import path from "node:path";
import * as statics from "./static";
import {
  getCommands,
  getConfig,
  getShortcuts,
  setCommands,
  setIconSize,
  setShortcut
} from "./store";
import { checkUpdate } from "./utils/autoupdate";
import { initSentry } from "./utils/sentry";
import {
  deleteImage,
  getImagePath,
  imageDirPath,
  saveCustomIconImage,
  saveIconImage
} from "./utils/image";
import {
  ensureBundleIdsInCommands,
  getBundleIdFromApp
} from "./utils/appMetadata";
import {
  createRunningAppsWatcher,
  type RunningAppsState
} from "./utils/runningApps";

initSentry();

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win: BrowserWindow | null;
let configWin: BrowserWindow | null;
let isVisible = false;
let isAnimation = false;
let runningAppsState: RunningAppsState = {};

const runningAppsWatcher = createRunningAppsWatcher({
  getCommands,
  onUpdate: (state) => {
    runningAppsState = state;
    win?.webContents.send("running-apps:update", state);
  }
});

/**
 * Notify renderer windows that config values have changed.
 */
const notifyConfigUpdated = () => {
  win?.webContents.send("config:updated");
  configWin?.webContents.send("config:updated");
};

function openConfig() {
  if (configWin && !configWin.isDestroyed()) {
    configWin.show();
    configWin.focus();
    return;
  }

  isVisible = false;
  isAnimation = false;
  win?.webContents.send("ring:close");
  win?.hide();
  win?.setIgnoreMouseEvents(true);
  win?.setVisibleOnAllWorkspaces(true);
  win?.setAlwaysOnTop(true);
  globalShortcut.unregisterAll();

  configWin = new BrowserWindow({
    width: 680,
    height: 480,
    icon: path.join(statics.publicRoot, "icon.png"),
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: statics.preload,
      devTools: statics.VITE_DEV_SERVER_URL ? true : false
    }
  });

  configWin.on("closed", () => {
    configWin = null;
    closeConfig();
  });

  if (statics.VITE_DEV_SERVER_URL) {
    configWin.loadURL(`${statics.pageRoot}?window=config`);
  } else {
    configWin.loadFile(statics.pageRoot, {
      query: { window: "config" }
    });
  }

  configWin.once("ready-to-show", () => {
    configWin?.show();
    configWin?.focus();
  });
}

function closeConfig() {
  if (configWin && !configWin.isDestroyed()) {
    configWin.close();
    return;
  }

  isVisible = false;
  setLauncherWindowPosition();
  win?.setIgnoreMouseEvents(true);
  win?.setVisibleOnAllWorkspaces(true);
  win?.setAlwaysOnTop(true);
  win?.blur();
  const config = getConfig();
  if (config.commands.length !== 0) {
    setGlobalShortcut();
  }
}

function setLauncherWindowPosition() {
  const { x, y } = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint({ x, y });
  const { workArea } = display;

  win?.setBounds({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height
  });
}

function toggleRing() {
  if (configWin && !configWin.isDestroyed()) {
    return;
  }
  if (isAnimation) return;
  isAnimation = true;
  if (isVisible) {
    win?.webContents.send("ring:close");
    isVisible = false;
  } else {
    setLauncherWindowPosition();
    win?.webContents.send("ring:open");
    isVisible = true;
    win?.show();
  }
}

function setGlobalShortcut() {
  const shortcuts = getShortcuts();
  if (globalShortcut.isRegistered(shortcuts.toggleCommand)) {
    globalShortcut.unregister(shortcuts.toggleCommand);
  }
  globalShortcut.register(shortcuts.toggleCommand, toggleRing);
}

function setMenu() {
  const template: (MenuItemConstructorOptions | MenuItem)[] = [
    {
      label: "RoundDrop",
      submenu: [
        {
          label: "About RoundDrop",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              icon: `${__dirname}/../public/icons/png/128x128.png`,
              title: "RoundDrop",
              message: "RoundDrop",
              detail: `Version: ${app.getVersion()}\n\nhttps://github.com/nekobato/RoundDrop/`
            });
          }
        },
        {
          label: "Config",
          click: () => {
            openConfig();
          }
        },
        {
          type: "separator"
        },
        {
          label: "Quit",
          accelerator: "Command+Q",
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: "Edit",
      role: "editMenu"
    }
  ];

  const { Menu } = require("electron");
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(statics.publicRoot, "icon.png"),
    webPreferences: {
      preload: statics.preload,
      devTools: statics.VITE_DEV_SERVER_URL ? true : false
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
  win.setVisibleOnAllWorkspaces(true);

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (statics.VITE_DEV_SERVER_URL) {
    win.loadURL(statics.pageRoot);
  } else {
    win.loadFile(statics.pageRoot);
  }
  win.setIgnoreMouseEvents(true);
  if (statics.VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (configWin && !configWin.isDestroyed()) {
    configWin.show();
    configWin.focus();
    return;
  }

  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    toggleRing();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  runningAppsWatcher.stop();
});

checkUpdate();

protocol.registerSchemesAsPrivileged([
  {
    scheme: "image",
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
]);

app
  .whenReady()
  .then(setMenu)
  .then(createWindow)
  .then(async () => {
    const config = getConfig();
    if (config.commands.length !== 0) {
      setGlobalShortcut();
    }

    const { changed, commands } = await ensureBundleIdsInCommands(
      config.commands
    );
    if (changed) {
      setCommands(commands);
    }
    runningAppsWatcher.start();

    ipcMain.on("ring:toggle", toggleRing);

    ipcMain.on("ring:opened", () => {
      win?.setIgnoreMouseEvents(false);
      win?.focus();
      isAnimation = false;
    });

    ipcMain.on("ring:closed", () => {
      win?.setIgnoreMouseEvents(true);
      win?.blur();
      win?.hide();
      isAnimation = false;
    });

    ipcMain.on("config:open", () => {
      openConfig();
    });

    ipcMain.on("config:close", () => {
      closeConfig();
    });

    ipcMain.handle("get:config", () => {
      return getConfig();
    });

    ipcMain.handle("get:shortcuts", () => {
      return getShortcuts();
    });

    ipcMain.handle("set:shortcuts", (_, payload) => {
      const result = setShortcut(payload);
      notifyConfigUpdated();
      return result;
    });

    ipcMain.handle("set:iconSize", (_, payload) => {
      const result = setIconSize(payload);
      notifyConfigUpdated();
      return result;
    });

    ipcMain.handle("get:commands", () => {
      return getCommands();
    });

    ipcMain.handle("get:running-apps", () => {
      return runningAppsState;
    });

    ipcMain.handle("set:commands", async (_, payload) => {
      const { commands } = await ensureBundleIdsInCommands(payload);
      const result = setCommands(commands);
      notifyConfigUpdated();
      return result;
    });

    ipcMain.handle(
      "add:appCommand",
      async (_, file: { path: string; name: string }) => {
        const id = nanoid();
        await saveIconImage(id, file.path);
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
        return;
      }
    );

    ipcMain.handle("add:application", async () => {
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
      await saveIconImage(id, filePath);
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
    });

    ipcMain.handle("add:directory", async (_, { name }) => {
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
    });

    ipcMain.handle("set:groupIcon", async (_, { id }) => {
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
        console.error("[image] Failed to save group icon", error);
        return { error: "アイコン画像の保存に失敗しました" };
      }
    });

    ipcMain.handle("remove:commandImage", (_, id) => {
      return deleteImage(id);
    });

    ipcMain.on("open-path", (_, path) => {
      if (path) {
        win?.webContents.send("ring:close");
        isVisible = false;
        shell.openPath(path);
      }
    });

    protocol.handle("image", (req) => {
      const imageName = new URL(req.url).pathname;

      // 400 if path is not safe
      const imagePath = getImagePath(imageName);
      const relativePath = path.relative(imageDirPath, imagePath);
      const isSafe =
        relativePath &&
        !relativePath.startsWith("..") &&
        !path.isAbsolute(relativePath);
      if (!isSafe) {
        return new Response("bad", {
          status: 400,
          headers: { "content-type": "text/html" }
        });
      }

      return net.fetch(`file://${imagePath}`);
    });
  });
