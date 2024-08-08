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
  saveIconImage
} from "./utils/image";

initSentry();

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

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
  setLauncherWindowPosition();
  win?.setIgnoreMouseEvents(true);
  win?.setVisibleOnAllWorkspaces(true);
  win?.setAlwaysOnTop(true);
  win?.blur();
  setGlobalShortcut();
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
  } else {
    toggleRing();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
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

      const id = nanoid();
      await saveIconImage(id, appPath);

      setCommands([
        ...getCommands(),
        {
          id,
          name: name.replace(".app", ""),
          command: appPath
        }
      ]);
      return;
    });

    ipcMain.handle("delete:command", (_, id) => {
      const commands = getCommands();
      const deleteCommand = commands.find((command) => {
        return command.id === id;
      });
      if (deleteCommand) {
        deleteImage(deleteCommand.id);
      }
      setCommands(
        commands.filter((command) => {
          return command.id !== id;
        })
      );
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
