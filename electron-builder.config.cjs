const pkg = require("./package.json");

/**
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: "net.nekobato.RoundDrop",
  asar: true,
  asarUnpack: ["node_modules/file-icon/**"],
  productName: "RoundDrop",
  directories: {
    output: `release/${pkg.version}`
  },
  files: ["dist", "!dist/assets/*.map", "dist-electron"],
  mac: {
    target: ["default"],
    icon: "dist/icons/mac/icon.icns",
    category: "public.app-category.productivity",
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    publish: ["github"]
  },
  // win: {
  //   target: [
  //     {
  //       target: "nsis",
  //       arch: ["x64"]
  //     }
  //   ]
  // },
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
