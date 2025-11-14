import Store from "electron-store";
import { AppCommand, Config } from "../src/types/app";

const DEFAULT_CONFIG: Config = {
  shortcuts: {
    toggleCommand: "Control+Alt+Z"
  },
  iconSize: 3,
  commands: []
};

const normalizeConfig = (config?: Partial<Config>): Config => {
  return {
    shortcuts: {
      ...DEFAULT_CONFIG.shortcuts,
      ...(config?.shortcuts ?? {})
    },
    iconSize:
      typeof config?.iconSize === "number" ? config.iconSize : DEFAULT_CONFIG.iconSize,
    commands: Array.isArray(config?.commands)
      ? config.commands
      : [...DEFAULT_CONFIG.commands]
  };
};

export const store = new Store<Config>({
  name: "config",
  defaults: DEFAULT_CONFIG,
  schema: {
    shortcuts: {
      type: "object",
      default: DEFAULT_CONFIG.shortcuts,
      properties: {
        toggleCommand: {
          type: "string",
          default: DEFAULT_CONFIG.shortcuts.toggleCommand
        }
      },
      required: ["toggleCommand"],
      additionalProperties: false
    },
    iconSize: {
      type: "number",
      default: DEFAULT_CONFIG.iconSize
    },
    commands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string"
          },
          type: {
            type: "string"
          },
          name: {
            type: "string"
          },
          command: {
            type: "string"
          },
          bundleId: {
            type: "string",
            nullable: true
          }
        },
        required: ["id", "type", "name", "command"]
      },
      default: DEFAULT_CONFIG.commands
    }
  },
  clearInvalidConfig: true
});

const ensureConfigHydrated = () => {
  const normalized = normalizeConfig(store.store as Partial<Config>);
  store.store = normalized;
};

ensureConfigHydrated();

export const getConfig = () => {
  return normalizeConfig(store.store as Partial<Config>);
};

export const getShortcuts = () => {
  return getConfig().shortcuts;
};

export const setShortcut = ({ name, command }) => {
  store.set(`shortcuts.${name}`, command);
};

export const setIconSize = (iconSize: number) => {
  store.set("iconSize", iconSize);
};

export const getCommands = () => {
  return getConfig().commands;
};

export const setCommands = (commands: AppCommand[]) => {
  store.set("commands", commands);
};
