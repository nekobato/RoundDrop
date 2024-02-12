import { dialog } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

export const checkUpdate = () => {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("update-available", (info) => {
    log.debug("autoUpdater: update-available", info);
  });

  autoUpdater.on("error", (info) => {
    log.debug("autoUpdater: error", info);
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.debug("autoUpdater: update-downloaded", info);
    dialog.showMessageBox({
      type: "info",
      buttons: ["いいよ", "ダメ"],
      title: "アップデートがあります",
      message: "再起動してね"
    });
  });

  return autoUpdater;
};
