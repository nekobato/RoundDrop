import { app, nativeImage } from "electron";
import fs from "node:fs";
import { fileIconToBuffer } from "file-icon";
import path from "node:path";

export const userDataPath = app.getPath("userData");

export const imageDirPath = `${userDataPath}/images`;

if (!fs.existsSync(imageDirPath)) {
  fs.mkdirSync(imageDirPath);
}

export const getImagePath = (filename: string) => {
  return path.join(imageDirPath, filename);
};

export const saveIconImage = async (id: string, appPath: string) => {
  const appIconBuffer: Buffer = (await fileIconToBuffer(appPath, {
    size: 128
  })) as Buffer;
  const image = nativeImage.createFromBuffer(appIconBuffer);
  const buffer = image.toPNG();
  const filePath = getImagePath(`${id}.png`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

export const deleteImage = (id: string) => {
  if (fs.existsSync(getImagePath(`${id}.png`))) {
    fs.rmSync(getImagePath(`${id}.png`));
  }
};
