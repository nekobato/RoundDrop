export const defaultConfig = {
  shortcuts: {
    toggleCommand: ""
  },
  iconSize: 0,
  commands: []
};

export const iconSizes = [24, 32, 48, 64];

export const keyEventToShortcut = (e: KeyboardEvent): string => {
  const shortcut = [];
  if (e.metaKey) {
    shortcut.push("Meta");
  }
  if (e.ctrlKey) {
    shortcut.push("Ctrl");
  }
  if (e.altKey) {
    shortcut.push("Alt");
  }
  if (e.shiftKey) {
    shortcut.push("Shift");
  }
  if (e.code === "Space") {
    shortcut.push("Space");
  } else if (e.code === "Escape") {
    shortcut.push("Escape");
  }
  shortcut.push(e.key);
  return shortcut.join("+");
};

export const keyboardEventToElectronAccelerator = (
  e: KeyboardEvent
): string => {
  const shortcut = [];
  if (e.metaKey) {
    shortcut.push("Meta");
  }
  if (e.ctrlKey) {
    shortcut.push("Ctrl");
  }
  if (e.altKey) {
    shortcut.push("Alt");
  }
  if (e.shiftKey) {
    shortcut.push("Shift");
  }
  switch (e.key) {
    case " ":
      shortcut.push("Space");
      break;
    case "+":
      shortcut.push("Plus");
      break;
    default:
      if (/Key[A-Z]/.test(e.code)) {
        shortcut.push(e.code.replace("Key", ""));
      } else if (/Arrow.+/.test(e.key)) {
        shortcut.push(e.key.replace("Arrow", ""));
      } else {
        shortcut.push(e.key);
      }
      break;
  }
  return shortcut.join("+");
};
