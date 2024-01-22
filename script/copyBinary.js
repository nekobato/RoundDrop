// copy node_modules/file-icon/file-icon to dist-electron/file-icon

const fs = require("fs-extra");
const path = require("path");

const source = path.join(
  __dirname,
  "..",
  "node_modules",
  "file-icon",
  "file-icon"
);
const target = path.join(__dirname, "..", "dist-electron", "file-icon");

fs.copySync(source, target);

console.log("copy bianry: done");
