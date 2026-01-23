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
  commands: AppCommand[];
};
