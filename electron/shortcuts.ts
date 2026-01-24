/**
 * Global shortcut registration utilities.
 */
import { globalShortcut } from "electron";

/**
 * Register the toggle shortcut, replacing any existing registration.
 */
export const registerToggleShortcut = (
  accelerator: string,
  onToggle: () => void
) => {
  if (globalShortcut.isRegistered(accelerator)) {
    globalShortcut.unregister(accelerator);
  }
  globalShortcut.register(accelerator, onToggle);
};

/**
 * Unregister all global shortcuts.
 */
export const unregisterAllShortcuts = () => {
  globalShortcut.unregisterAll();
};
