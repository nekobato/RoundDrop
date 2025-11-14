import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AppCommand } from "../../src/types/app";

const execFileAsync = promisify(execFile);

const LSAPPINFO_BIN = "/usr/bin/lsappinfo";
const POLL_INTERVAL = 2000;

export type RunningAppsState = Record<string, boolean>;

const collectCommands = (
  commands: AppCommand[],
  collection: AppCommand[] = []
) => {
  for (const command of commands) {
    collection.push(command);
    if (command.children && command.children.length > 0) {
      collectCommands(command.children, collection);
    }
  }
  return collection;
};

const parseBundleIds = (stdout: string): Set<string> => {
  const bundleIds = new Set<string>();
  const regex =
    /"?\b(?:bundleID|BundleIdentifier|LSBundleID)"?\s*=\s*"([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stdout)) !== null) {
    bundleIds.add(match[1]);
  }
  return bundleIds;
};

const createState = (
  commands: AppCommand[],
  runningBundleIds: Set<string>
): RunningAppsState => {
  const state: RunningAppsState = {};
  for (const command of collectCommands(commands)) {
    if (command.type === "command") {
      state[command.id] = Boolean(
        command.bundleId && runningBundleIds.has(command.bundleId)
      );
    }
  }
  return state;
};

export const createRunningAppsWatcher = ({
  getCommands,
  onUpdate,
  intervalMs = POLL_INTERVAL
}: {
  getCommands: () => AppCommand[];
  onUpdate: (state: RunningAppsState) => void;
  intervalMs?: number;
}) => {
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;
  let lastPayload = "";

  const schedule = () => {
    if (stopped) {
      return;
    }
    timer = setTimeout(poll, intervalMs);
  };

  const poll = async () => {
    if (stopped) {
      return;
    }
    try {
      const { stdout } = await execFileAsync(LSAPPINFO_BIN, ["list"]);
      const runningSet = parseBundleIds(stdout ?? "");
      const commands = getCommands();
      const state = createState(commands, runningSet);
      const payload = JSON.stringify(state);
      if (payload !== lastPayload) {
        lastPayload = payload;
        onUpdate(state);
      }
    } catch (error) {
      console.error("[runningApps] Failed to inspect running applications", error);
    } finally {
      schedule();
    }
  };

  const start = () => {
    if (process.platform !== "darwin" || stopped) {
      return;
    }
    if (!timer) {
      poll();
    }
  };

  const stop = () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    start,
    stop
  };
};
