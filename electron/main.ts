import {
  BrowserWindow,
  app,
  dialog,
  globalShortcut,
  ipcMain,
  shell,
  type MenuItem,
  type MenuItemConstructorOptions
} from "electron";
import { fileIconToBuffer } from "file-icon";
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
import { initSentry, reportError } from "./utils/sentry";

initSentry();

// 残像防止
app.disableHardwareAcceleration();

let win: BrowserWindow | null;
let isVisible = false;
let isAnimation = false;

function openConfig() {
  win?.setIgnoreMouseEvents(false);
  win?.setVisibleOnAllWorkspaces(false);
  win?.setAlwaysOnTop(false);
  win?.webContents.send("ring:config");
  isVisible = true;
  win?.setSize(640, 480);
  win?.center();
  win?.show();
  win?.focus();
  globalShortcut.unregisterAll();
}

function closeConfig() {
  isVisible = false;
  win?.hide();
  const { workArea } = require("electron").screen.getPrimaryDisplay();
  win?.setBounds({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height
  });
  win?.setIgnoreMouseEvents(true);
  win?.setVisibleOnAllWorkspaces(true);
  win?.setAlwaysOnTop(true);
  win?.blur();
  setGlobalShortcut();
}

function toggleRing() {
  if (isAnimation) return;
  isAnimation = true;
  if (isVisible) {
    win?.webContents.send("ring:close");
    isVisible = false;
  } else {
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
      label: "CircleCommand",
      submenu: [
        {
          label: "About CircleCommand",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              icon: `${__dirname}/../public/icons/png/128x128.png`,
              title: "CircleCommand",
              message: `CircleCommand`,
              detail: `Version: ${app.getVersion()}\n\nhttps://github.com/nekobato/CircleCommand/`
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
      preload: statics.preload
    },
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    show: false,
    roundedCorners: false
  });

  const { workArea } = require("electron").screen.getPrimaryDisplay();
  win.setBounds({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height
  });
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
    win.webContents.openDevTools();
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

checkUpdate();

app
  .whenReady()
  .then(setMenu)
  .then(createWindow)
  .then(() => {
    const config = getConfig();
    if (config.commands.length !== 0) {
      setGlobalShortcut();
    }

    ipcMain.on("ring:toggle", toggleRing);

    ipcMain.on("ring:opened", () => {
      console.log("ring:opened");
      win?.setIgnoreMouseEvents(false);
      win?.focus();
      isAnimation = false;
    });

    ipcMain.on("ring:closed", () => {
      console.log("ring:closed");
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
      return setShortcut(payload);
    });

    ipcMain.handle("set:iconSize", (_, payload) => {
      return setIconSize(payload);
    });

    ipcMain.handle("get:commands", () => {
      return getCommands();
    });

    ipcMain.handle("set:commands", (_, payload) => {
      return setCommands(payload);
    });

    ipcMain.handle("add:appCommand", async (_, { name, appPath }) => {
      console.log(appPath, name);

      const appIconBuffer: Buffer = await fileIconToBuffer(appPath, {
        size: 128
      });
      setCommands([
        ...getCommands(),
        {
          id: nanoid(),
          name: name.replace(".app", ""),
          command: appPath,
          icon: appIconBuffer.toString("base64")
        }
      ]);
      return;
    });

    ipcMain.handle("delete:command", (_, id) => {
      const commands = getCommands();
      const newCommands = commands.filter((command) => {
        return command.id !== id;
      });
      setCommands(newCommands);
    });

    ipcMain.on("open-path", (_, path) => {
      if (path) {
        win?.webContents.send("ring:close");
        isVisible = false;
        shell.openPath(path);
      }
    });
  });
