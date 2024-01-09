import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import * as statics from "./static";
import path from "node:path";

// 残像防止
app.disableHardwareAcceleration();

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(statics.publicRoot, "vite.svg"),
    webPreferences: {
      preload: statics.preload,
    },
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
  });

  const { workArea } = require("electron").screen.getPrimaryDisplay();
  win.setBounds({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
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

app
  .whenReady()
  .then(createWindow)
  .then(() => {
    globalShortcut.register("CommandOrControl+Shift+|", () => {
      if (win?.isVisible()) {
        win?.webContents.send("ring:close");
      } else {
        win?.show();
        win?.webContents.send("ring:open");
      }
    });

    ipcMain.on("ring:opened", () => {
      win?.focus();
    });

    ipcMain.on("ring:closed", () => {
      win?.hide();
    });
  });
