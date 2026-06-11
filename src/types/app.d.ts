export type AppCommand = {
  id: string;
  type: "command" | "group";
  name: string;
  command: string;
  bundleId?: string;
  iconVersion?: number;
  children?: AppCommand[];
};

export type Config = {
  shortcuts: {
    toggleCommand: string;
  };
  iconSize: number;
  windowSelectionEnabled: boolean;
  diagnostics: {
    enabled: boolean;
  };
  commands: AppCommand[];
};

export type RunningWindow = {
  id: string;
  title: string;
  appIcon?: string;
};

export type WindowSelectionPermissionStatus =
  | "not-determined"
  | "granted"
  | "denied"
  | "restricted"
  | "unknown";

export type WindowSelectionPermissionName = "screen-recording";

export type WindowSelectionPermission = {
  name: WindowSelectionPermissionName;
  label: string;
  granted: boolean;
  status?: WindowSelectionPermissionStatus;
};

export type WindowSelectionPermissionCheckResult = {
  granted: boolean;
  permissions: WindowSelectionPermission[];
};

export type RunningWindowsResult = {
  windows: RunningWindow[];
  status: WindowSelectionPermissionStatus;
  error?: string;
  logPath?: string;
};

export type WindowSelectionToggleResult = {
  enabled: boolean;
  status: WindowSelectionPermissionStatus;
  permissions?: WindowSelectionPermission[];
  error?: string;
  logPath?: string;
};

export type WindowActivationRequest = {
  id: string;
};

export type WindowActivationResult = {
  activated: boolean;
  focused: boolean;
  status:
    | "focused"
    | "app-activated"
    | "accessibility-permission-required"
    | "activation-failed"
    | "ax-window-not-found"
    | "helper-unavailable"
    | "invalid-arguments"
    | "invalid-window-id"
    | "raise-failed"
    | "unsupported-platform"
    | "window-not-found"
    | "encoding-failed";
  error?: string;
  windowId?: number;
  processId?: number;
  title?: string;
  logPath?: string;
};
