<script setup lang="ts">
import { computed } from "vue";
const props = defineProps({
  image: {
    type: String,
    required: true
  },
  iconSize: {
    type: Number,
    required: true
  }
});

const image = computed(() => {
  // from base64
  return `data:image/png;base64,${props.image}`;
});
</script>
<template>
  <div class="image-container" :class="`size-${props.iconSize}`">
    <img :src="image" />
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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
