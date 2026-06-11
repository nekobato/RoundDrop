<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import CommandCursor from "./Cursor.vue";
import type {
  AppCommand,
  Config,
  RunningWindow,
  RunningWindowsResult
} from "../types/app";
import { findNodeDepthById } from "./Config/treeUtil";
import type { CSSProperties, Ref } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  noTransition: {
    type: Boolean,
    default: false
  }
});

const config = inject<Ref<Config>>("config");

const runningApps = inject<Ref<Record<string, boolean>>>("runningApps");

const ICON_PIXEL_SIZES = [24, 32, 48, 64] as const;
const BASE_RING_SIZE = 320;

const rootCommands = computed(() => {
  return config?.value.commands;
});

const isAppRunning = (id: string) => {
  if (!runningApps?.value) {
    return false;
  }
  return Boolean(runningApps.value[id]);
};

const createIconSrc = (item: AppCommand) => {
  if (item.type === "command") {
    return `image://image/${item.id}.png`;
  }
  if (typeof item.iconVersion === "number") {
    return `image://image/${item.id}.png?v=${item.iconVersion}`;
  }
  return undefined;
};

const commands = ref<AppCommand[]>(rootCommands.value || []);
const dirDepths = ref<string[]>([]);

const commandListElement = ref<HTMLElement | null>(null);
const focusIndex = ref(0);
const pauseTransition = ref(false);
const isWindowSelectionVisible = ref(false);
const isWindowSelectionLoading = ref(false);
const windowSelectionError = ref<string>();
const windowSelectionFocusIndex = ref(0);
const windowSelectionWindows = ref<RunningWindow[]>([]);

/**
 * Normalize an arbitrary focus index for circular list navigation.
 */
const normalizeFocusIndex = (index: number, length: number) => {
  const len = length || 1;
  if (!len) return 0;
  const mod = index % len;
  return mod >= 0 ? mod : len + mod;
};

const iconSizePx = computed(() => {
  const sizeIndex = config?.value.iconSize ?? 2;
  return ICON_PIXEL_SIZES[sizeIndex] ?? ICON_PIXEL_SIZES[2];
});

type RingItem = {
  id: string;
  image?: string;
  isRunning: boolean;
  name: string;
  type: AppCommand["type"];
};

const launcherRingItems = computed<RingItem[]>(() => {
  return commands.value.map((item) => ({
    id: item.id,
    image: createIconSrc(item),
    isRunning: item.type === "command" && isAppRunning(item.id),
    name: item.name,
    type: item.type
  }));
});

const windowRingItems = computed<RingItem[]>(() => {
  return windowSelectionWindows.value.map((window) => ({
    id: window.id,
    image: window.appIcon,
    isRunning: false,
    name: window.title,
    type: "command"
  }));
});

const activeRingItems = computed(() => {
  return isWindowSelectionVisible.value
    ? windowRingItems.value
    : launcherRingItems.value;
});

const itemLength = computed(() => activeRingItems.value.length || 1);

const activeFocusIndex = computed(() => {
  return isWindowSelectionVisible.value
    ? windowSelectionFocusIndex.value
    : focusIndex.value;
});

const normalizedFocusIndex = computed(() => {
  return normalizeFocusIndex(activeFocusIndex.value, itemLength.value);
});

const normalizedLauncherFocusIndex = computed(() => {
  return normalizeFocusIndex(focusIndex.value, commands.value.length || 1);
});

const rotationPerItem = computed(() => 360 / itemLength.value);

const ringSize = computed(() => {
  const gapPx = Math.max(8, iconSizePx.value * 0.35);
  const circumferenceNeeded = itemLength.value * (iconSizePx.value + gapPx);
  const requiredRadius = circumferenceNeeded / (2 * Math.PI);
  const sizeFromSpacing = iconSizePx.value + requiredRadius * Math.SQRT2;
  return Math.max(BASE_RING_SIZE, Math.ceil(sizeFromSpacing));
});

const ringStyle = computed(() => ({
  width: `${ringSize.value}px`,
  height: `${ringSize.value}px`
}));

const commandStyle = computed(() => {
  return {
    transform: `rotate(${rotationPerItem.value * -activeFocusIndex.value}deg)`
  };
});

const moveIntoGroup = (id: string) => {
  const group = commands.value.find((command) => command.id === id);
  if (group?.children) {
    closeWindowSelection();
    commands.value = group.children;
    dirDepths.value.push(group.id);
    focusIndex.value = 0;
  }
};

type RenderRingItem = RingItem & {
  style: CSSProperties;
  iconStyle: CSSProperties;
  isFocus: boolean;
};

const renderRingItems = computed<RenderRingItem[]>(() => {
  return activeRingItems.value.map((item, index) => {
    const angle = index * rotationPerItem.value;
    const iconAngle = -(angle - activeFocusIndex.value * rotationPerItem.value);
    return {
      ...item,
      style: { transform: `rotate(${angle}deg)` },
      iconStyle: { transform: `rotate(${iconAngle}deg)` },
      isFocus: index === normalizedFocusIndex.value
    };
  });
});

const focusedLauncherItem = computed(() => {
  return commands.value[normalizedLauncherFocusIndex.value];
});

const focusedCommand = computed(() => {
  const item = focusedLauncherItem.value;
  return item?.type === "command" ? item : undefined;
});

const focusedWindow = computed(() => {
  if (!isWindowSelectionVisible.value) {
    return undefined;
  }
  return windowSelectionWindows.value[normalizedFocusIndex.value];
});

const windowSelectionStatusLabel = computed(() => {
  if (!isWindowSelectionVisible.value) {
    return undefined;
  }
  if (isWindowSelectionLoading.value) {
    return "読み込み中";
  }
  if (windowSelectionError.value) {
    return "ウィンドウ取得不可";
  }
  if (windowSelectionWindows.value.length === 0) {
    return "ウィンドウなし";
  }
  return undefined;
});

const iconName = computed(() => {
  if (isWindowSelectionVisible.value) {
    return (
      windowSelectionStatusLabel.value ??
      activeRingItems.value[normalizedFocusIndex.value]?.name
    );
  }
  return focusedLauncherItem.value?.name;
});

const canOpenWindowSelection = computed(() => {
  const command = focusedCommand.value;
  return Boolean(
    config?.value.windowSelectionEnabled &&
      command &&
      isAppRunning(command.id)
  );
});

const closeWindowSelection = () => {
  isWindowSelectionVisible.value = false;
  isWindowSelectionLoading.value = false;
  windowSelectionError.value = undefined;
  windowSelectionFocusIndex.value = 0;
  windowSelectionWindows.value = [];
};

const applyRunningWindowsResult = (result: RunningWindowsResult) => {
  windowSelectionWindows.value = result.windows;
  windowSelectionError.value = result.error;
  windowSelectionFocusIndex.value = 0;
};

const openWindowSelection = async () => {
  if (!canOpenWindowSelection.value || isWindowSelectionLoading.value) {
    return;
  }

  isWindowSelectionVisible.value = true;
  isWindowSelectionLoading.value = true;
  windowSelectionError.value = undefined;
  windowSelectionWindows.value = [];

  try {
    const result = (await window.ipc.invoke(
      "get:running-windows"
    )) as RunningWindowsResult;
    applyRunningWindowsResult(result);
  } catch (error) {
    console.error("[ring] Failed to get running windows", error);
    windowSelectionError.value = "ウィンドウ一覧の取得に失敗しました";
  } finally {
    isWindowSelectionLoading.value = false;
  }
};

const moveWindowSelectionFocus = (delta: number) => {
  if (!isWindowSelectionVisible.value || windowSelectionWindows.value.length === 0) {
    return;
  }
  windowSelectionFocusIndex.value += delta;
};

const onKeyDownRight = () => {
  if (isWindowSelectionVisible.value) {
    moveWindowSelectionFocus(1);
    return;
  }
  focusIndex.value += 1;
};

const onKeyDownLeft = () => {
  if (isWindowSelectionVisible.value) {
    moveWindowSelectionFocus(-1);
    return;
  }
  focusIndex.value -= 1;
};

const onKeyDownUp = () => {
  if (isWindowSelectionVisible.value) {
    return;
  }

  if (dirDepths.value.length === 0 || !rootCommands.value) {
    return;
  }

  const parentGroup = findNodeDepthById(
    rootCommands.value,
    dirDepths.value[dirDepths.value.length - 1]
  );

  if (parentGroup) {
    commands.value = parentGroup;
    dirDepths.value.pop();
    focusIndex.value = 0;
  }
};

const onKeyDownZ = () => {
  if (isWindowSelectionVisible.value) {
    closeWindowSelection();
    return;
  }
  if (canOpenWindowSelection.value) {
    void openWindowSelection();
  }
};

const onKeyDownEnter = async () => {
  if (isWindowSelectionVisible.value) {
    const windowItem = focusedWindow.value;
    if (windowItem) {
      await window.ipc.invoke("focus:running-window", {
        id: windowItem.id
      });
    }
    return;
  }

  const item = focusedLauncherItem.value;

  if (!item) {
    return;
  }

  if (item.type === "command") {
    window.ipc.send("open-path", item.command);
  } else if (item.id) {
    moveIntoGroup(item.id);
  }
};

// 大きすぎる値にならないように止まった時点でリセットする
const onListTransitionEnd = () => {
  const currentFocusIndex = isWindowSelectionVisible.value
    ? windowSelectionFocusIndex.value
    : focusIndex.value;

  if (Math.abs(currentFocusIndex) >= itemLength.value) {
    const nextFocusIndex =
      currentFocusIndex >= 0
        ? Math.abs(currentFocusIndex) % itemLength.value
        : -Math.abs(currentFocusIndex) % itemLength.value;

    if (isWindowSelectionVisible.value) {
      windowSelectionFocusIndex.value = nextFocusIndex;
    } else {
      focusIndex.value = nextFocusIndex;
    }
    pauseTransition.value = true;
    setTimeout(() => {
      pauseTransition.value = false;
    }, 0);
  }
};

const close = () => {
  window.ipc.send("ring:toggle");
};

const onKeyDownEsc = () => {
  if (isWindowSelectionVisible.value) {
    closeWindowSelection();
    return;
  }
  close();
};

const onAfterEnter = () => {
  if (props.noTransition) {
    return;
  }
  commandListElement.value?.focus();
  window.ipc.send("ring:opened");
};

const onAfterLeave = () => {
  if (props.noTransition) {
    return;
  }
  dirDepths.value = [];
  commands.value = rootCommands.value || [];
  focusIndex.value = 0;
  closeWindowSelection();
  window.ipc.send("ring:closed");
};

// commandsに変更があったら状態をリセット
watch(
  rootCommands,
  (newCommands) => {
    commands.value = newCommands || [];
    dirDepths.value = [];
    focusIndex.value = 0;
    closeWindowSelection();
  },
  { immediate: true }
);

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      closeWindowSelection();
    }
  }
);

watch(
  () => config?.value.windowSelectionEnabled,
  (enabled) => {
    if (!enabled) {
      closeWindowSelection();
    }
  }
);

onMounted(() => {
  commandListElement.value?.focus();
});
</script>

<template>
  <Transition
    name="ring"
    appear
    @after-leave="onAfterLeave"
    @after-enter="onAfterEnter"
    :key="dirDepths.join('-')"
    v-if="config"
  >
    <div
      class="ring-command-container"
      v-show="props.visible"
      :style="ringStyle"
      @keydown.right="onKeyDownRight"
      @keydown.left="onKeyDownLeft"
      @keydown.up="onKeyDownUp"
      @keydown.z.prevent="onKeyDownZ"
      @keydown.esc="onKeyDownEsc"
      @keydown.enter="onKeyDownEnter"
      ref="commandListElement"
      tabindex="0"
    >
      <div class="ring-command-list outer">
        <ul
          class="ring-command-list inner"
          :class="{ pause: pauseTransition }"
          :style="commandStyle"
          @transitionend.stop="onListTransitionEnd"
        >
          <li
            v-for="item in renderRingItems"
            :key="item.id"
            :style="item.style"
            :class="[{ focus: item.isFocus }, `size-${config.iconSize}`]"
            @transitionend.stop
          >
            <div class="ring-command-item inner" @transitionend.stop>
              <AppIcon
                class="icon"
                :image="item.image"
                :iconSize="config.iconSize"
                :type="item.type"
                :isRunning="item.isRunning"
                :style="item.iconStyle"
              />
            </div>
          </li>
        </ul>
      </div>
      <CommandCursor
        class="cursor"
        :class="`size-${config.iconSize}`"
        v-if="renderRingItems.length > 0"
      />
      <span
        class="name"
        :class="`size-${config.iconSize}`"
      >
        {{ iconName }}
      </span>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
$animation-duration: 0.3s;
$animation-function-enter: cubic-bezier(0.215, 0.61, 0.355, 1);
$animation-function-leave: cubic-bezier(0.55, 0.055, 0.675, 0.19);

$icon-size-0: 24px;
$icon-size-1: 32px;
$icon-size-2: 48px;
$icon-size-3: 64px;

.ring-command-container {
  width: 320px;
  height: 320px;
  transition: transform $animation-duration $animation-function-enter;
  will-change: transform;
  outline: none;
}
.ring-command-list {
  position: relative;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  transition: transform $animation-duration $animation-function-enter;
  transform-origin: 50% 50%;
  will-change: transform;
  outline: none;

  &.pause {
    transition: none;
    > li {
      transition: none;
    }

    .icon {
      transition: none;
    }
  }

  > li,
  .ring-command-item {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    transition: transform $animation-duration $animation-function-enter;
    transform-origin: 50% 50%;
    will-change: transform;

    &.focus .name {
      visibility: visible;
    }
    &.size-0 {
      width: $icon-size-0;
      left: calc(50% - $icon-size-0 / 2);
    }
    &.size-1 {
      width: $icon-size-1;
      left: calc(50% - $icon-size-1 / 2);
    }
    &.size-2 {
      width: $icon-size-2;
      left: calc(50% - $icon-size-2 / 2);
    }
    &.size-3 {
      width: $icon-size-3;
      left: calc(50% - $icon-size-3 / 2);
    }
  }
}
.cursor {
  position: absolute;
  top: -4px;
  &.size-0 {
    width: $icon-size-0 + 8px;
    height: $icon-size-0 + 8px;
    left: calc(50% - $icon-size-0 / 2 - 4px);
  }
  &.size-1 {
    width: $icon-size-1 + 8px;
    height: $icon-size-1 + 8px;
    left: calc(50% - $icon-size-1 / 2 - 4px);
  }
  &.size-2 {
    width: $icon-size-2 + 8px;
    height: $icon-size-2 + 8px;
    left: calc(50% - $icon-size-2 / 2 - 4px);
  }
  &.size-3 {
    width: $icon-size-3 + 8px;
    height: $icon-size-3 + 8px;
    left: calc(50% - $icon-size-3 / 2 - 4px);
  }
}

.icon {
  position: absolute;
  top: 0;
  left: 0;
  transition: transform $animation-duration $animation-function-enter;
  transform-origin: 50% 50%;
  will-change: transform;
}
.name {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  position: absolute;
  overflow: hidden;
  padding: 0 8px;
  font-size: 12px;
  font-weight: bold;
  color: #ffffff;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.size-0 {
    top: 32px;
  }
  &.size-1 {
    top: 40px;
  }
  &.size-2 {
    top: 56px;
  }
  &.size-3 {
    top: 72px;
  }
}

// animation
.ring-enter-from,
.ring-leave-to {
  .ring-command-list.outer {
    transform: rotate(120deg);
  }
  .ring-command-item {
    transform: translateX(640px);
    opacity: 0.5;
  }
}
.ring-enter-from {
  .ring-command-list.outer,
  .ring-command-item {
    transition-timing-function: $animation-function-enter;
  }
}
.ring-leave-to {
  .ring-command-list.outer,
  .ring-command-item {
    transition-timing-function: $animation-function-leave;
  }
}
</style>
