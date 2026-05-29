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

export type RunningWindowsResult = {
  windows: RunningWindow[];
  status: WindowSelectionPermissionStatus;
  error?: string;
  logPath?: string;
};

export type WindowSelectionToggleResult = {
  enabled: boolean;
  status: WindowSelectionPermissionStatus;
  error?: string;
  logPath?: string;
};
