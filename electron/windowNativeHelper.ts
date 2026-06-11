/**
 * Shared macOS native helper invocation utilities for window operations.
 */
import { app } from "electron";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const HELPER_TIMEOUT_MS = 5000;
const HELPER_BINARY_NAME = "rounddrop-window-activator";
const SWIFT_SOURCE_PATH = path.join(
  process.cwd(),
  "native/window-activator/WindowActivator.swift"
);

type HelperInvocation = {
  command: string;
  args: string[];
};

/**
 * Resolve the native helper invocation for packaged and development builds.
 */
const createWindowHelperInvocation = (
  args: string[]
): HelperInvocation | undefined => {
  const packagedHelperPath = path.join(
    process.resourcesPath,
    "native",
    HELPER_BINARY_NAME
  );
  if (app.isPackaged && existsSync(packagedHelperPath)) {
    return {
      command: packagedHelperPath,
      args
    };
  }

  if (app.isPackaged) {
    return undefined;
  }

  const developmentHelperPath = path.join(
    process.cwd(),
    "build/native",
    HELPER_BINARY_NAME
  );
  if (existsSync(developmentHelperPath)) {
    return {
      command: developmentHelperPath,
      args
    };
  }

  if (!existsSync(SWIFT_SOURCE_PATH)) {
    return undefined;
  }

  return {
    command: "/usr/bin/swift",
    args: [SWIFT_SOURCE_PATH, ...args]
  };
};

/**
 * Run the native helper and convert stdout or failure into a typed result.
 */
export const runWindowNativeHelper = async <Result>({
  args,
  parseStdout,
  createUnavailableResult,
  createFailureResult
}: {
  args: string[];
  parseStdout: (stdout: string) => Result;
  createUnavailableResult: () => Result;
  createFailureResult: (message: string) => Result;
}): Promise<Result> => {
  const invocation = createWindowHelperInvocation(args);
  if (!invocation) {
    return createUnavailableResult();
  }

  return await new Promise((resolve) => {
    execFile(
      invocation.command,
      invocation.args,
      { timeout: HELPER_TIMEOUT_MS },
      (error, stdout, stderr) => {
        try {
          resolve(parseStdout(stdout));
          return;
        } catch {
          resolve(
            createFailureResult(
              stderr.trim() ||
                (error instanceof Error
                  ? error.message
                  : "Native window helper failed")
            )
          );
        }
      }
    );
  });
};
