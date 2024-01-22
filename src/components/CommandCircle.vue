<script setup lang="ts">
import { Ref, Transition, computed, inject, onMounted, ref } from "vue";
import AppIcon from "./AppIcon.vue";
import CommandCursor from "./CommandCursor.vue";
import { Config } from "../types/app";

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

const commandList = ref<HTMLElement | null>(null);
const focusIndex = ref(0);
const itemLength = computed(() => config?.value.commands.length || 1);
const pauseTransition = ref(false);

const commandStyle = computed(() => {
  return {
    transform: `rotate(${(360 / itemLength.value) * -focusIndex.value}deg)`
  };
});

const iconName = computed(() => {
  const item =
    config?.value.commands[
      focusIndex.value < 0
        ? itemLength.value + focusIndex.value
        : focusIndex.value
    ];
  return item?.name;
});

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

const onKeyDownEnter = () => {
  const item =
    config?.value.commands[
      focusIndex.value < 0
        ? itemLength.value + focusIndex.value
        : focusIndex.value
    ];
  if (item?.command) {
    window.ipc.send("open-path", item.command);
  }
};

// 大きすぎる値にならないように止まった時点でリセットする
const onListTransitionEnd = () => {
  if (Math.abs(focusIndex.value) >= itemLength.value) {
    focusIndex.value = Math.abs(focusIndex.value) % itemLength.value;
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
  commandList.value?.focus();
  window.ipc.send("ring:opened");
};

const onAfterLeave = () => {
  if (props.noTransition) {
    return;
  }
  window.ipc.send("ring:closed");
};

onMounted(() => {
  commandList.value?.focus();
});
</script>

<template>
  <Transition
    name="ring"
    appear
    @after-leave="onAfterLeave"
    @after-enter="onAfterEnter"
    v-if="config"
  >
    <div class="ring-command-container" v-show="props.visible">
      <div class="ring-command-list outer">
        <ul
          class="ring-command-list inner"
          :class="{ pause: pauseTransition }"
          @keydown.right="onKeyDownRight"
          @keydown.left="onKeyDownLeft"
          @keydown.esc="close"
          ref="commandList"
          tabindex="0"
          :style="commandStyle"
          @transitionend.stop="onListTransitionEnd"
          @keydown.enter="onKeyDownEnter"
        >
          <li
            v-for="(item, index) in config.commands"
            :key="index"
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
                :image="item.icon"
                :iconSize="config.iconSize"
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
.ring-command-container {
  width: 320px;
  height: 320px;
  transition: transform $animation-duration cubic-bezier(0.215, 0.61, 0.355, 1);
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
  transition: transform $animation-duration cubic-bezier(0.215, 0.61, 0.355, 1);
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
    transform-origin: 0 50%;
    transition: transform $animation-duration
      cubic-bezier(0.215, 0.61, 0.355, 1);
    transform-origin: 50% 50%;
    will-change: transform;

    &.focus .name {
      visibility: visible;
    }
    &.size-0 {
      width: 24px;
      left: calc(50% - 12px);
    }
    &.size-1 {
      width: 32px;
      left: calc(50% - 16px);
    }
    &.size-2 {
      width: 48px;
      left: calc(50% - 24px);
    }
    &.size-3 {
      width: 64px;
      left: calc(50% - 32px);
    }
  }
}
.cursor {
  position: absolute;
  top: -4px;
  &.size-0 {
    width: 32px;
    height: 32px;
    left: calc(50% - 16px);
  }
  &.size-1 {
    width: 40px;
    height: 40px;
    left: calc(50% - 20px);
  }
  &.size-2 {
    width: 56px;
    height: 56px;
    left: calc(50% - 28px);
  }
  &.size-3 {
    width: 72px;
    height: 72px;
    left: calc(50% - 36px);
  }
}

.icon {
  position: absolute;
  top: 0;
  left: 0;
  transition: transform $animation-duration cubic-bezier(0.215, 0.61, 0.355, 1);
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
  transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
}
.ring-leave-to {
  transition-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
}
.ring-enter-active,
.ring-leave-active {
}
</style>
