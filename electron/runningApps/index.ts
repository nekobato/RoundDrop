/**
 * Platform-aware facade for watching running applications.
 */
import type { AppCommand } from "../../src/types/app";
import {
  createRunningAppsWatcher as createMacWatcher,
  type RunningAppsState
} from "./macos";

type RunningAppsWatcher = {
  start: () => void;
  stop: () => void;
};

/**
 * Create a no-op watcher for non-macOS platforms.
 */
const createNoopWatcher = (): RunningAppsWatcher => {
  return {
    start: () => {},
    stop: () => {}
  };
};

/**
 * Create a running apps watcher for the current platform.
 */
export const createRunningAppsWatcher = ({
  getCommands,
  onUpdate,
  intervalMs
}: {
  getCommands: () => AppCommand[];
  onUpdate: (state: RunningAppsState) => void;
  intervalMs?: number;
}): RunningAppsWatcher => {
  if (process.platform !== "darwin") {
    return createNoopWatcher();
  }
  return createMacWatcher({ getCommands, onUpdate, intervalMs });
};

export type { RunningAppsState };
