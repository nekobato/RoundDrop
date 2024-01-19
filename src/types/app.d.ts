export type AppCommand = {
  id: string;
  name: string;
  command: string;
  icon: string;
};

export type Config = {
  shortcuts: {
    toggleCommand: string;
  };
  iconSize: number;
  commands: AppCommand[];
};
