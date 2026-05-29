<script setup lang="ts">
import { computed } from "vue";
import type { RunningWindow } from "@/types/app";

const props = defineProps<{
  appName?: string;
  error?: string;
  focusIndex: number;
  loading: boolean;
  windows: RunningWindow[];
}>();

const normalizedFocusIndex = computed(() => {
  if (props.windows.length === 0) {
    return 0;
  }
  const mod = props.focusIndex % props.windows.length;
  return mod >= 0 ? mod : props.windows.length + mod;
});

const listLabel = computed(() => {
  return props.appName
    ? `${props.appName} のウィンドウ一覧`
    : "ウィンドウ一覧";
});
</script>

<template>
  <div class="window-list" role="listbox" :aria-label="listLabel">
    <p class="status" v-if="loading">読み込み中</p>
    <p class="status error" v-else-if="error">{{ error }}</p>
    <p class="status" v-else-if="windows.length === 0">
      ウィンドウが見つかりません
    </p>
    <ul class="items" v-else>
      <li
        class="item"
        v-for="(window, index) in windows"
        :key="window.id"
        :class="{ focus: index === normalizedFocusIndex }"
        role="option"
        :aria-selected="index === normalizedFocusIndex"
      >
        <img
          class="app-icon"
          v-if="window.appIcon"
          :src="window.appIcon"
          alt=""
          aria-hidden="true"
        />
        <span class="app-icon fallback" v-else aria-hidden="true" />
        <span class="title">{{ window.title }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.window-list {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  width: min(360px, calc(100vw - 48px));
  max-height: min(300px, calc(100vh - 96px));
  transform: translate(-50%, -50%);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-white-t200);
  border-radius: 8px;
  background-color: var(--color-black-t800);
  box-shadow: 0 16px 48px var(--color-black-t400);
  color: var(--color-white);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  list-style: none;
}

.item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  min-height: 36px;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  color: var(--color-white-t700);

  &.focus {
    background-color: var(--color-white-t200);
    color: var(--color-white);
  }
}

.app-icon {
  width: 24px;
  height: 24px;
  border-radius: 5px;

  &.fallback {
    display: inline-flex;
    background-color: var(--color-white-t200);
  }
}

.title {
  overflow: hidden;
  font-size: 12px;
  font-weight: bold;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  margin: 0;
  padding: 16px;
  color: var(--color-white-t700);
  font-size: 12px;
  text-align: center;

  &.error {
    color: var(--color-red-100);
  }
}
</style>
