require("dotenv").config();
const pkg = require("./package.json");

const productName = "CommandCircle";
const version = pkg.version;

export default {
  $schema:
    "https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json",
  appId: "net.nekobato.command-circle",
  asar: true,
  productName,
  directories: {
    output: `release/${version}`
  },
  files: [
    "dist",
    "dist-electron",
    {
      from: "node_modules/file-icon/file-icon",
      to: "dist-electron/file-icon"
    }
  ],
  mac: {
    target: ["default"],
    icon: "dist/icons/mac/icon.icns",
    category: "public.app-category.productivity",
    notarize: {
      teamId: process.env.APPLE_TEAM_ID || ""
    },
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    publish: ["github"]
  },
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ]
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false
  },
  linux: {
    target: ["AppImage"]
  },
  afterSign: "electron-builder-notarize"
};
