import { app, nativeImage } from "electron";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { logError } from "./logger";

const execFileAsync = promisify(execFile);
const FILE_ICON_SIZE = 128;
const FILE_ICON_MAX_BUFFER = 1024 * 1024 * 100;

export const userDataPath = app.getPath("userData");

export const imageDirPath = `${userDataPath}/images`;

if (!fs.existsSync(imageDirPath)) {
  fs.mkdirSync(imageDirPath);
}

export const getImagePath = (filename: string) => {
  return path.join(imageDirPath, filename);
};

const getFileIconBinaryPath = () => {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "node_modules",
      "file-icon",
      "file-icon"
    );
  }

  return path.join(app.getAppPath(), "node_modules", "file-icon", "file-icon");
};

const createFileIconArgument = (appPath: string, size: number) => {
  return JSON.stringify([
    {
      appOrPID: appPath,
      size
    }
  ]);
};

const getIconDiagnostics = (targetAppPath: string, binaryPath: string) => {
  const infoPlistPath = path.join(targetAppPath, "Contents", "Info.plist");

  return {
    targetAppPath,
    targetAppExists: fs.existsSync(targetAppPath),
    infoPlistPath,
    infoPlistExists: fs.existsSync(infoPlistPath),
    binaryPath,
    binaryExists: fs.existsSync(binaryPath),
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appRootPath: app.getAppPath(),
    execPath: process.execPath,
    userDataPath
  };
};

const readAppIconBuffer = async (targetAppPath: string) => {
  const binaryPath = getFileIconBinaryPath();

  try {
    const { stdout } = await execFileAsync(
      binaryPath,
      [createFileIconArgument(targetAppPath, FILE_ICON_SIZE)],
      {
        encoding: null,
        maxBuffer: FILE_ICON_MAX_BUFFER
      }
    );

    if (!Buffer.isBuffer(stdout) || stdout.length === 0) {
      throw new Error("file-icon returned an empty buffer");
    }

    return stdout;
  } catch (error) {
    logError(
      "image",
      "Failed to extract app icon with file-icon binary",
      error,
      getIconDiagnostics(targetAppPath, binaryPath)
    );
    throw error;
  }
};

export const saveIconImage = async (id: string, appPath: string) => {
  const appIconBuffer = await readAppIconBuffer(appPath);
  const image = nativeImage.createFromBuffer(appIconBuffer);

  if (image.isEmpty()) {
    const error = new Error("nativeImage failed to decode icon buffer");
    logError("image", "Failed to decode app icon buffer", error, {
      targetAppPath: appPath
    });
    throw error;
  }

  const buffer = image.toPNG();
  const filePath = getImagePath(`${id}.png`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

/**
 * Save a custom icon image as a 128x128 PNG.
 */
export const saveCustomIconImage = async (
  id: string,
  sourcePath: string
) => {
  const extension = path.extname(sourcePath).toLowerCase();
  const image =
    extension === ".svg"
      ? nativeImage.createFromDataURL(
          `data:image/svg+xml;base64,${fs
            .readFileSync(sourcePath)
            .toString("base64")}`
        )
      : nativeImage.createFromPath(sourcePath);
  const { width, height } = image.getSize();
  if (width === 0 || height === 0) {
    throw new Error("invalid image");
  }
  const resized = image.resize({ width: 128, height: 128 });
  const buffer = resized.toPNG();
  const filePath = getImagePath(`${id}.png`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

export const deleteImage = (id: string) => {
  if (fs.existsSync(getImagePath(`${id}.png`))) {
    fs.rmSync(getImagePath(`${id}.png`));
  }
};
