<script setup lang="ts">
import { Ref, Transition, computed, inject, onMounted, ref } from "vue";
import AppIcon from "./AppIcon.vue";
import CommandCursor from "./CommandCursor.vue";
import { Config } from "../types/app";

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
});

const config = inject<Ref<Config>>("config");

const ringCommandList = ref<HTMLElement | null>(null);
const focusIndex = ref(0);
const itemLength = computed(() => config?.value.commands.length || 1);
const pauseTransition = ref(false);

const commandStyle = computed(() => {
  return {
    transform: `rotate(${(360 / itemLength.value) * -focusIndex.value}deg)`,
  };
});

const commandItemStyle = (index: number) => {
  const angle = (index * 360) / itemLength.value;
  return {
    transform: `rotate(${angle}deg)`,
  };
};

const commandItemIconStyle = (index: number) => {
  const angle = -(
    (index * 360) / itemLength.value -
    (focusIndex.value * 360) / itemLength.value
  );
  return {
    transform: `rotate(${angle}deg)`,
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
  console.log(item?.command, focusIndex.value, itemLength.value);
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

const onAfterEnter = () => {
  ringCommandList.value?.focus();
  window.ipc.send("ring:opened");
};

const onAfterLeave = () => {
  window.ipc.send("ring:closed");
};

onMounted(() => {
  ringCommandList.value?.focus();
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
          ref="ringCommandList"
          tabindex="0"
          :style="commandStyle"
          @transitionend.stop="onListTransitionEnd"
          @keydown.enter="onKeyDownEnter"
        >
          <li
            v-for="(item, index) in config.commands"
            :key="index"
            :style="commandItemStyle(index)"
            :class="{
              focus:
                index ===
                (focusIndex < 0 ? itemLength + focusIndex : focusIndex),
            }"
            @transitionend.stop
          >
            <div class="ring-command-item inner" @transitionend.stop>
              <AppIcon
                class="icon"
                :image="item.icon"
                :iconSize="config.iconSize"
                :style="commandItemIconStyle(index)"
              />
              <span class="name">{{ item.name }}</span>
            </div>
          </li>
        </ul>
      </div>
      <CommandCursor class="cursor" />
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.ring-command-container {
  width: 320px;
  height: 320px;
  transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1);
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
  transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1);
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
    width: 48px;
    height: 100%;
    position: absolute;
    top: 0;
    left: calc(50% - 24px);
    transform-origin: 0 50%;
    transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1);
    transform-origin: 50% 50%;
    will-change: transform;

    &.focus .name {
      visibility: visible;
    }
  }
}
.cursor {
  position: absolute;
  top: -4px;
  left: calc(50% - 28px);
}

.icon {
  position: absolute;
  top: 0;
  left: 0;
  transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1);
  transform-origin: 50% 50%;
  will-change: transform;
}
.name {
  position: absolute;
  top: 56px;
  font-size: 12px;
  font-weight: bold;
  visibility: hidden;
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
.ring-enter-active,
.ring-leave-active {
}
</style>
