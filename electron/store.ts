import Store from "electron-store";

export const store = new Store({
  name: "config",
  defaults: {
    shortcuts: {
      toggleCommand: "Control+Alt+Z"
    },
    iconSize: 2,
    commands: [] as {
      id: string;
      name: string;
      command: string;
      icon: string;
    }[]
  }
});

export const getConfig = () => {
  return {
    shortcuts: store.get("shortcuts"),
    iconSize: store.get("iconSize"),
    commands: store.get("commands")
  };
};

export const getShortcuts = () => {
  return store.get("shortcuts");
};

export const setShortcut = ({ name, command }) => {
  store.set(`shortcuts.${name}`, command);
};

export const setIconSize = (iconSize) => {
  store.set("iconSize", iconSize);
};

export const getCommands = () => {
  return store.get("commands");
};

export const setCommands = (commands) => {
  store.set("commands", commands);
};
