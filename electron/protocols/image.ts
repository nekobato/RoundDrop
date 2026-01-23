/**
 * Custom image protocol registration.
 */
import { net, protocol } from "electron";
import path from "node:path";
import { getImagePath, imageDirPath } from "../utils/image";

/**
 * Register the image:// scheme as privileged.
 */
export const registerImageScheme = () => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "image",
      privileges: {
        secure: true,
        supportFetchAPI: true,
        bypassCSP: true
      }
    }
  ]);
};

/**
 * Register the image:// protocol handler.
 */
export const registerImageProtocol = () => {
  protocol.handle("image", (req) => {
    const imageName = new URL(req.url).pathname;

    const imagePath = getImagePath(imageName);
    const relativePath = path.relative(imageDirPath, imagePath);
    const isSafe =
      relativePath &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath);
    if (!isSafe) {
      return new Response("bad", {
        status: 400,
        headers: { "content-type": "text/html" }
      });
    }

    return net.fetch(`file://${imagePath}`);
  });
};
