import Store from "electron-store";

export const store = new Store({
  name: "config",
  defaults: {
    shortcuts: {
      toggleCommand: "Control+Alt+Z",
    },
    iconSize: 1,
    commands: [],
  },
});

export const getConfig = () => {
  return {
    shortcuts: store.get("shortcuts"),
    iconSize: store.get("iconSize"),
    commands: store.get("commands"),
  };
};

export const getShortcuts = () => {
  return store.get("shortcuts");
};

export const setShortcut = ({ name, command }) => {
  store.set(`shortcuts.${name}`, command);
};

export const getCommands = () => {
  return store.get("commands");
};

export const setCommands = (commands) => {
  store.set("commands", commands);
};

export const addCommand = (newCommand: {
  name: string;
  command: string;
  icon: Uint8Array;
}) => {
  setCommands([
    ...getCommands(),
    {
      ...newCommand,
      icon: Buffer.from(newCommand.icon).toString("base64"),
    },
  ]);
};
