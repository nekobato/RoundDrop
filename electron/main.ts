import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  type MenuItemConstructorOptions,
  shell,
  type MenuItem
} from "electron";
import { Icns } from "@fiahfy/icns";
import plist from "plist";
import * as statics from "./static";
import {
  getConfig,
  getShortcuts,
  setShortcut,
  setIconSize,
  getCommands,
  setCommands
} from "./store";
import { nanoid } from "nanoid/non-secure";
import path from "node:path";
import fs from "node:fs";

// 残像防止
app.disableHardwareAcceleration();

let win: BrowserWindow | null;
let isVisible = false;
let isAnimation = false;

function openConfig() {
  win?.setIgnoreMouseEvents(false);
  win?.setVisibleOnAllWorkspaces(false);
  win?.webContents.send("ring:config");
  isVisible = true;
  win?.setSize(640, 480);
  win?.show();
  win?.focus();
  win?.center();
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
  setGlobalShortcut();
}

function setGlobalShortcut() {
  const shortcuts = getShortcuts();
  if (globalShortcut.isRegistered(shortcuts.toggleCommand)) {
    globalShortcut.unregister(shortcuts.toggleCommand);
  }
  globalShortcut.register(shortcuts.toggleCommand, () => {
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
  });
}

function setMenu() {
  const template: (MenuItemConstructorOptions | MenuItem)[] = [
    {
      label: "RingCommand",
      submenu: [
        {
          label: "Config",
          click: openConfig
        },
        {
          type: "separator"
        },
        {
          label: "Quit",
          accelerator: "Command+Q",
          click: function () {
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
    icon: path.join(statics.publicRoot, "vite.svg"),
    webPreferences: {
      preload: statics.preload
    },
    // alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    show: true,
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
  // win.setIgnoreMouseEvents(true);
  win.webContents.openDevTools();
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

app
  .whenReady()
  .then(setMenu)
  .then(createWindow)
  .then(() => {
    const config = getConfig();
    if (config.commands.length !== 0) {
      setGlobalShortcut();
    }

    ipcMain.on("ring:opened", () => {
      console.log("ring:opened");
      win?.setIgnoreMouseEvents(false);
      win?.focus();
      isAnimation = false;
    });

    ipcMain.on("ring:closed", () => {
      console.log("ring:closed");
      win?.setIgnoreMouseEvents(true);
      isAnimation = false;
      win?.hide();
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

    ipcMain.handle("add:appCommand", (_, { name, appPath }) => {
      console.log(appPath, name);
      let iconFileName: string | undefined = undefined;
      try {
        const xml = fs.readFileSync(
          path.join(appPath, "Contents/Info.plist"),
          "utf8"
        );
        iconFileName = plist.parse(xml)?.CFBundleIconFile;
        if (!iconFileName?.endsWith(".icns")) {
          iconFileName = iconFileName + ".icns";
        }
      } catch (e) {
        console.log(e);
      }

      if (!iconFileName) {
        const appDirFiles = fs.readdirSync(
          path.join(appPath, "Contents/Resources")
        );
        iconFileName = appDirFiles.find((file) => file.endsWith(".icns"));
      }

      if (!iconFileName) {
        return {
          error: "Icon not found."
        };
      }

      const icons = Icns.from(
        fs.readFileSync(path.join(appPath, "Contents/Resources", iconFileName))
      ).images;
      const base64Data = Buffer.from(
        // biggest icon
        icons.reduce((a, b) => {
          return a.bytes > b.bytes ? a : b;
        }).image
      ).toString("base64");
      setCommands([
        ...getCommands(),
        {
          id: nanoid(),
          name: name.replace(".app", ""),
          command: appPath,
          icon: base64Data
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
