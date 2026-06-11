import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const source = resolve("native/window-activator/WindowActivator.swift");
const output = resolve("build/native/rounddrop-window-activator");

if (process.platform !== "darwin") {
  console.log("Skipping macOS window activator build on non-darwin platform.");
  process.exit(0);
}

mkdirSync(dirname(output), { recursive: true });

const result = spawnSync(
  "swiftc",
  [source, "-framework", "AppKit", "-framework", "ApplicationServices", "-o", output],
  {
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
