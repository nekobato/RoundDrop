const pkg = require("./package.json");

/**
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  $schema:
    "https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json",
  appId: "net.nekobato.RoundDrop",
  asar: true,
  productName: "RoundDrop",
  directories: {
    output: `release/${pkg.version}`
  },
  files: [
    "dist",
    "!dist/assets/*.map",
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
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    notarize: {
      teamId: process.env.APPLE_TEAM_ID
    },
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
  }
  // linux: {
  //   target: ["AppImage"],
  // },
};

module.exports = config;
