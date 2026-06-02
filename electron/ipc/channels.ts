/**
 * IPC channel names shared across main and renderer.
 */
export const IPC_CHANNELS = {
  ringToggle: "ring:toggle",
  ringOpened: "ring:opened",
  ringClosed: "ring:closed",
  ringOpen: "ring:open",
  ringClose: "ring:close",
  configOpen: "config:open",
  configClose: "config:close",
  configUpdated: "config:updated",
  getConfig: "get:config",
  getShortcuts: "get:shortcuts",
  setShortcuts: "set:shortcuts",
  setIconSize: "set:iconSize",
  setWindowSelectionEnabled: "set:windowSelectionEnabled",
  getCommands: "get:commands",
  getRunningApps: "get:running-apps",
  getRunningWindows: "get:running-windows",
  getWindowSelectionPermissions: "get:window-selection-permissions",
  setCommands: "set:commands",
  addAppCommand: "add:appCommand",
  addApplication: "add:application",
  addDirectory: "add:directory",
  setGroupIcon: "set:groupIcon",
  removeCommandImage: "remove:commandImage",
  openPath: "open-path",
  runningAppsUpdate: "running-apps:update",
  mainProcessMessage: "main-process-message",
  openUrl: "open-url"
} as const;
