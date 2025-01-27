<script setup lang="ts">
import { Icon } from "@iconify/vue";

const emit = defineEmits(["exit"]);

const exit = () => {
  emit("exit");
};
</script>

<template>
  <div class="window-header">
    <button class="nn-button type-ghost exit" @click="exit">
      <Icon icon="mingcute:close-line" class="nn-icon size-xsmall" />
    </button>
    <div class="rest"></div>
  </div>
</template>

<style lang="scss" scoped>
.window-header {
  display: flex;
  flex: 1 0 auto;
  align-items: center;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.rest {
  flex: 1;
  -webkit-app-region: drag;
  width: 100%;
  height: 100%;
}

.nn-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  padding: 0;
  margin: 0;
  border: none;
  background-color: transparent;
  color: var(--hazy-text-color);
  cursor: pointer;
  transition: background-color 0.2s;
  overflow: hidden;
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
}
</style>
