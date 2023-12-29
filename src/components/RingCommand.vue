<script setup lang="ts">
import { Transition, computed, nextTick, onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import CommandCursor from "./CommandCursor.vue";

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
});

const commandList = [
  {
    icon: "logos:slack-icon",
    name: "Slack",
  },
  {
    icon: "logos:discord-icon",
    name: "Discord",
  },
  {
    icon: "logos:chrome",
    name: "Chrome",
  },
  {
    icon: "logos:google-calendar",
    name: "Google Calendar",
  },
  {
    icon: "logos:visual-studio-code",
    name: "Visual Studio Code",
  },
  {
    icon: "logos:figma",
    name: "Figma",
  },
  {
    icon: "logos:adobe-illustrator",
    name: "Adobe Illustrator",
  },
  {
    icon: "logos:spotify-icon",
    name: "Spotify",
  },
];

const ringCommandList = ref<HTMLElement | null>(null);
const focusIndex = ref(0);
const itemLength = ref(8);
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

// 大きすぎる値にならないように止まった時点でリセットする
const onListTransitionEnd = () => {
  if (Math.abs(focusIndex.value) >= itemLength.value) {
    pauseTransition.value = true;
    focusIndex.value = Math.abs(focusIndex.value) % itemLength.value;
    setTimeout(() => {
      pauseTransition.value = false;
    }, 0);
  }
};

onMounted(() => {
  ringCommandList.value?.focus();
});
</script>

<template>
  <Transition name="ring" appear>
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
          @transitionend="onListTransitionEnd"
        >
          <li
            v-for="(item, index) in commandList"
            :key="index"
            :style="commandItemStyle(index)"
            :class="{
              focus:
                index ===
                (focusIndex < 0 ? itemLength + focusIndex : focusIndex),
            }"
          >
            <div class="ring-command-item inner">
              <Icon
                class="icon"
                :icon="item.icon"
                :width="48"
                :height="48"
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
  outline: none;

  &.pause {
    transition: none;

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

    > svg {
      position: absolute;
      top: 0;
      left: 0;
      transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1);
      will-change: transform;
      transform-origin: 50% 50%;
    }
  }
}
.cursor {
  position: absolute;
  top: -4px;
  left: calc(50% - 28px);
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
    transform: translateX(400px);
  }
}
.ring-enter-active,
.ring-leave-active {
}
</style>
