import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "plist";
import { AppCommand } from "../../src/types/app";

const bundleIdCache = new Map<string, string | null>();

const infoPlistPath = (appPath: string) =>
  path.join(appPath, "Contents", "Info.plist");

export const getBundleIdFromApp = async (
  appPath: string
): Promise<string | undefined> => {
  if (bundleIdCache.has(appPath)) {
    return bundleIdCache.get(appPath) ?? undefined;
  }

  try {
    const plistFile = await fs.readFile(infoPlistPath(appPath), "utf8");
    const plist = parse(plistFile) as { CFBundleIdentifier?: string };
    if (typeof plist.CFBundleIdentifier === "string") {
      bundleIdCache.set(appPath, plist.CFBundleIdentifier);
      return plist.CFBundleIdentifier;
    }
  } catch (error) {
    console.error(`[appMetadata] Failed to read Info.plist (${appPath})`, error);
  }

  bundleIdCache.set(appPath, null);
  return undefined;
};

type EnsureResult = {
  commands: AppCommand[];
  changed: boolean;
};

export const ensureBundleIdsInCommands = async (
  commands: AppCommand[]
): Promise<EnsureResult> => {
  let updated = false;

  const ensureNode = async (command: AppCommand): Promise<AppCommand> => {
    let nextCommand = command;

    const isAppBundle =
      typeof command.command === "string" &&
      command.command.toLowerCase().endsWith(".app");

    if (
      command.type === "command" &&
      !command.bundleId &&
      command.command &&
      isAppBundle
    ) {
      const bundleId = await getBundleIdFromApp(command.command);
      if (bundleId) {
        nextCommand = {
          ...nextCommand,
          bundleId
        };
        updated = true;
      }
    }

    if (command.children && command.children.length > 0) {
      const nextChildren: AppCommand[] = [];
      let childrenChanged = false;
      for (let index = 0; index < command.children.length; index += 1) {
        const child = command.children[index];
        const nextChild = await ensureNode(child);
        if (nextChild !== child) {
          childrenChanged = true;
        }
        nextChildren.push(nextChild);
      }
      if (childrenChanged) {
        nextCommand = {
          ...nextCommand,
          children: nextChildren
        };
      }
    }

    return nextCommand;
  };

  const nextCommands = [];
  for (const command of commands) {
    nextCommands.push(await ensureNode(command));
  }

  return {
    commands: updated ? nextCommands : commands,
    changed: updated
  };
};
