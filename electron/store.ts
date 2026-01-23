/**
 * Persistent configuration store for the Electron main process.
 */
import Store from "electron-store";
import { AppCommand, Config } from "../src/types/app";

type ShortcutName = keyof Config["shortcuts"];

type ShortcutPayload = {
  name: ShortcutName;
  command: string;
};

const DEFAULT_CONFIG: Config = {
  shortcuts: {
    toggleCommand: "Control+Alt+Z"
  },
  iconSize: 3,
  commands: []
};

/**
 * Normalize config values with defaults.
 */
const normalizeConfig = (config?: Partial<Config>): Config => {
  return {
    shortcuts: {
      ...DEFAULT_CONFIG.shortcuts,
      ...(config?.shortcuts ?? {})
    },
    iconSize:
      typeof config?.iconSize === "number"
        ? config.iconSize
        : DEFAULT_CONFIG.iconSize,
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
            type: ["string", "null"]
          },
          iconVersion: {
            type: ["number", "null"]
          },
          children: {
            type: "array",
            items: {
              type: "object"
            }
          }
        },
        required: ["id", "type", "name", "command"]
      },
      default: DEFAULT_CONFIG.commands
    }
  },
  clearInvalidConfig: true
});

/**
 * Ensure the stored config is normalized and complete.
 */
const ensureConfigHydrated = () => {
  const normalized = normalizeConfig(store.store as Partial<Config>);
  store.store = normalized;
};

ensureConfigHydrated();

/**
 * Get the normalized config object.
 */
export const getConfig = () => {
  return normalizeConfig(store.store as Partial<Config>);
};

/**
 * Get the shortcut configuration.
 */
export const getShortcuts = () => {
  return getConfig().shortcuts;
};

/**
 * Update a shortcut command by name.
 */
export const setShortcut = ({ name, command }: ShortcutPayload) => {
  store.set(`shortcuts.${name}`, command);
};

/**
 * Update the icon size.
 */
export const setIconSize = (iconSize: number) => {
  store.set("iconSize", iconSize);
};

/**
 * Get the command list.
 */
export const getCommands = () => {
  return getConfig().commands;
};

/**
 * Persist the command list.
 */
export const setCommands = (commands: AppCommand[]) => {
  store.set("commands", commands);
};
