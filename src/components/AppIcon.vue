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
  }
});
</script>
<template>
  <div class="image-container" :class="`size-${props.iconSize}`">
    <img v-if="props.type === 'command'" class="icon" :src="props.image" />
    <Icon v-else class="icon" icon="mingcute:folder-fill" />
  </div>
</template>
<style scoped lang="scss">
.image-container {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
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
}
</style>
