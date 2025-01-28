export type AppCommand = {
  id: string;
  type: "command" | "group";
  name: string;
  command: string;
  children?: AppCommand[];
};

export type Config = {
  shortcuts: {
    toggleCommand: string;
  };
  iconSize: number;
  commands: AppCommand[];
};
