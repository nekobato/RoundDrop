<script setup lang="ts">
import { Ref, computed, inject, onMounted, ref } from "vue";
import AppIcon from "./AppIcon.vue";
import CommandCursor from "./Cursor.vue";
import { AppCommand, Config } from "../types/app";
import { findNodeDepthById } from "./Config/treeUtil";

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

const rootCommands = computed(() => {
  return config?.value.commands;
});

const commands = ref<AppCommand[]>(rootCommands.value || []);
const dirDepths = ref<string[]>([]);

const commandListElement = ref<HTMLElement | null>(null);
const focusIndex = ref(0);
const itemLength = computed(() => commands.value.length || 1);
const pauseTransition = ref(false);

const commandStyle = computed(() => {
  return {
    transform: `rotate(${(360 / itemLength.value) * -focusIndex.value}deg)`
  };
});

const iconName = computed(() => {
  const item =
    commands.value[
      focusIndex.value < 0
        ? itemLength.value + focusIndex.value
        : focusIndex.value
    ];
  return item?.name;
});

const moveIntoGroup = (id: string) => {
  const group = commands.value.find((command) => command.id === id);
  if (group?.children) {
    commands.value = group.children;
    dirDepths.value.push(group.id);
    focusIndex.value = 0;
  }
};

const commandItemStyle = (index: number) => {
  const angle = (index * 360) / itemLength.value;
  return {
    transform: `rotate(${angle}deg)`
  };
};

const commandItemIconStyle = (index: number) => {
  const angle = -(
    (index * 360) / itemLength.value -
    (focusIndex.value * 360) / itemLength.value
  );
  return {
    transform: `rotate(${angle}deg)`
  };
};

const onKeyDownRight = () => {
  focusIndex.value += 1;
};

const onKeyDownLeft = () => {
  focusIndex.value -= 1;
};

const onKeyDownUp = () => {
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

const onKeyDownEnter = () => {
  const item =
    commands.value[
      focusIndex.value < 0
        ? itemLength.value + focusIndex.value
        : focusIndex.value
    ];

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
  if (Math.abs(focusIndex.value) >= itemLength.value) {
    focusIndex.value =
      focusIndex.value >= 0
        ? Math.abs(focusIndex.value) % itemLength.value
        : -Math.abs(focusIndex.value) % itemLength.value;
    pauseTransition.value = true;
    setTimeout(() => {
      pauseTransition.value = false;
    }, 0);
  }
};

const close = () => {
  window.ipc.send("ring:toggle");
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
  window.ipc.send("ring:closed");
};

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
    <div class="ring-command-container" v-show="props.visible">
      <div class="ring-command-list outer">
        <ul
          class="ring-command-list inner"
          :class="{ pause: pauseTransition }"
          @keydown.right="onKeyDownRight"
          @keydown.left="onKeyDownLeft"
          @keydown.up="onKeyDownUp"
          @keydown.esc="close"
          ref="commandListElement"
          tabindex="0"
          :style="commandStyle"
          @transitionend.stop="onListTransitionEnd"
          @keydown.enter="onKeyDownEnter"
        >
          <li
            v-for="(item, index) in commands"
            :key="item.id"
            :style="commandItemStyle(index)"
            :class="[
              {
                focus:
                  index ===
                  (focusIndex < 0 ? itemLength + focusIndex : focusIndex)
              },
              `size-${config.iconSize}`
            ]"
            @transitionend.stop
          >
            <div class="ring-command-item inner" @transitionend.stop>
              <AppIcon
                class="icon"
                :image="'image://image/' + item.id + '.png'"
                :iconSize="config.iconSize"
                :type="item.type"
                :style="commandItemIconStyle(index)"
              />
            </div>
          </li>
        </ul>
      </div>
      <CommandCursor class="cursor" :class="`size-${config.iconSize}`" />
      <span class="name" :class="`size-${config.iconSize}`">{{
        iconName
      }}</span>
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
  font-size: 12px;
  font-weight: bold;
  color: #ffffff;

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
