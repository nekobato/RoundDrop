/**
 * Application menu setup.
 */
import {
  Menu,
  type MenuItem,
  type MenuItemConstructorOptions,
  dialog,
  app
} from "electron";

type MenuDeps = {
  openConfig: () => void;
  aboutIconPath: string;
};

/**
 * Set the application menu.
 */
export const setMenu = ({ openConfig, aboutIconPath }: MenuDeps) => {
  const template: (MenuItemConstructorOptions | MenuItem)[] = [
    {
      label: "RoundDrop",
      submenu: [
        {
          label: "About RoundDrop",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              icon: aboutIconPath,
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

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};
