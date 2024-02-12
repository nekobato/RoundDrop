import { dialog } from "electron";
import { autoUpdater } from "electron-updater";

export const checkUpdate = () => {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("update-downloaded", () => {
    dialog.showMessageBox({
      type: "info",
      buttons: ["いいよ", "ダメ"],
      title: "アップデートがあります",
      message: "再起動してね"
    });
  });

  return autoUpdater;
};
