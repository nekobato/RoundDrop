import Store from "electron-store";

export const store = new Store({
  name: "config",
  defaults: {
    shortcuts: {
      toggleCommand: "Control+Alt+Z",
    },
    commands: [],
  },
});

export const getShortcuts = () => {
  return store.get("shortcuts");
};

export const setShortcuts = ({ name, command }) => {
  store.set(`shortcuts.${name}`, command);
};

export const getCommands = () => {
  return store.get("commands");
};

export const setCommands = (commands) => {
  store.set("commands", commands);
};
