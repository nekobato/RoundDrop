<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = defineProps({
  image: {
    type: String,
    required: false
  },
  iconSize: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  isRunning: {
    type: Boolean,
    default: false
  }
});
</script>
<template>
  <div class="image-container" :class="[`size-${props.iconSize}`]">
    <img v-if="props.type === 'command'" class="icon" :src="props.image" />
    <Icon v-else class="icon" icon="mingcute:folder-fill" />
    <span
      v-if="props.isRunning && props.type === 'command'"
      class="running-indicator"
    />
  </div>
</template>
<style scoped lang="scss">
.image-container {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  &.size-0 {
    width: 24px;
    height: 24px;
  }
  &.size-1 {
    width: 32px;
    height: 32px;
  }
  &.size-2 {
    width: 48px;
    height: 48px;
  }
  &.size-3 {
    width: 64px;
    height: 64px;
  }

  .icon {
    width: 100%;
    height: 100%;
    object-fit: cover;
    color: var(--color-grey-100);
  }

  .running-indicator {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    border: 2px solid var(--color-black-t800);
    background-color: var(--color-success);
    bottom: 4px;
    right: 4px;
    box-shadow: 0 0 8px rgba(58, 206, 109, 0.8);
  }

  &.size-0 .running-indicator {
    width: 8px;
    height: 8px;
    border-width: 1.5px;
    bottom: 2px;
    right: 2px;
  }

  &.size-1 .running-indicator {
    width: 10px;
    height: 10px;
    border-width: 1.5px;
    bottom: 3px;
    right: 3px;
  }
}
</style>
