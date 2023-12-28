<script setup lang="ts">
import { Transition, computed, onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import CommandCursor from "./CommandCursor.vue";

const ringCommandList = ref<HTMLElement | null>(null);
const rotation = ref(1);
const itemLength = ref(8);
const transitionState = ref("enter");

const translateX = computed(() => {
  switch (transitionState.value) {
    case "enter":
      return 300;
    case "leave":
      return 300;
    case "after-enter":
    default:
      return 120;
  }
});

const enterRotate = computed(() => {
  switch (transitionState.value) {
    case "enter":
      return 120;
    case "leave":
      return 120;
    case "after-enter":
    default:
      return 0;
  }
});

const commandStyle = computed(() => {
  return {
    transform: `rotate(${360 / itemLength.value}deg)`,
  };
});

const commandItemStyle = (index: number) => {
  const angle =
    (index * 360) / itemLength.value +
    (rotation.value * 360) / itemLength.value +
    enterRotate.value;
  return {
    transform: `rotate(${angle}deg)`,
  };
};

const commandItemIconStyle = (index: number) => {
  const angle =
    (index * 360) / itemLength.value +
    45 +
    (rotation.value * 360) / itemLength.value;
  return {
    transform: `translate(${translateX.value}px, 0) rotate(-${angle}deg)`,
  };
};

const onKeyDownRight = () => {
  rotation.value += 1;
};

const onKeyDownLeft = () => {
  rotation.value -= 1;
};

const updateTransitionState = (state: string) => {
  console.log("updateTransitionState", state);
  transitionState.value = state;
};

onMounted(() => {
  ringCommandList.value?.focus();
});
</script>

<template>
  <div class="ring-command-container">
    <Transition
      @before-enter="updateTransitionState('enter')"
      @after-enter="updateTransitionState('after-enter')"
      @leave="
        (_, done) => {
          updateTransitionState('leave');
          done();
        }
      "
      appear
    >
      <ul
        class="ring-command-list"
        @keydown.right="onKeyDownRight"
        @keydown.left="onKeyDownLeft"
        ref="ringCommandList"
        tabindex="0"
        :style="commandStyle"
      >
        <li :style="commandItemStyle(0)">
          <Icon
            icon="logos:slack-icon"
            :width="48"
            :height="48"
            :style="commandItemIconStyle(0)"
          />
        </li>
        <li :style="commandItemStyle(1)">
          <Icon
            icon="logos:discord-icon"
            :width="48"
            :height="48"
            :style="commandItemIconStyle(1)"
          />
        </li>
        <li :style="commandItemStyle(2)">
          <Icon
            icon="logos:chrome"
            :width="48"
            :height="48"
            :style="commandItemIconStyle(2)"
          />
        </li>
        <li :style="commandItemStyle(3)">
          <Icon
            icon="logos:google-calendar"
            :width="48"
            :height="48"
            :style="commandItemIconStyle(3)"
          />
        </li>
        <li :style="commandItemStyle(4)">
          <Icon
            icon="logos:visual-studio-code"
            :width="48"
            :height="48"
            :style="commandItemIconStyle(4)"
          />
        </li>
        <li :style="commandItemStyle(5)">
          <Icon
            icon="logos:figma"
            :width="48"
            :height="48"
            :style="commandItemIconStyle(5)"
          />
        </li>
        <li :style="commandItemStyle(6)">
          <Icon
            icon="logos:adobe-illustrator"
            :width="48"
            :height="48"
            :style="commandItemIconStyle(6)"
          />
        </li>
        <li :style="commandItemStyle(7)">
          <Icon
            icon="logos:spotify-icon"
            :width="48"
            :height="48"
            :style="commandItemIconStyle(7)"
          />
        </li>
      </ul>
    </Transition>
    <CommandCursor class="cursor" />
  </div>
</template>

<style scoped lang="scss">
.ring-command-container {
  width: 240px;
  height: 240px;
}
.ring-command-list {
  position: relative;
  margin: 0;
  padding: 0;
  width: 240px;
  height: 240px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  transform-origin: 50% 50%;
  outline: none;

  > li {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 100px;
    height: 48px;
    position: absolute;
    top: calc(50% - 24px);
    left: 50%;
    transform-origin: 0 50%;
    transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1);
    will-change: transform;

    > svg {
      position: absolute;
      top: 0;
      left: 0;
      transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1);
      will-change: transform;
    }
  }
}
.cursor {
  position: absolute;
  top: -52px;
  left: calc(50% - 28px);
}
</style>
