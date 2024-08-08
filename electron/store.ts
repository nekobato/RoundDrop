import Store from "electron-store";
import { Config } from "../src/types/app";

export const store = new Store<Config>({
  name: "config",
  schema: {
    shortcuts: {
      type: "object",
      properties: {
        toggleCommand: {
          type: "string",
          default: "Control+Alt+Z"
        }
      }
    },
    iconSize: {
      type: "number",
      default: 3
    },
    commands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string"
          },
          name: {
            type: "string"
          },
          command: {
            type: "string"
          }
        }
      },
      default: []
    }
  },
  clearInvalidConfig: true
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
