<script setup lang="ts">
import { Ref, computed, inject, ref } from "vue";
import { AppCommand, Config } from "@/types/app";
import { defaultConfig, deepToRaw, keyboardEventToElectronAccelerator } from "@/utils";
import CommandTree from "./CommandTree.vue";
import { Icon } from "@iconify/vue";
import { ElMessage } from "element-plus";

// buffer to base64 on browser
const config = inject<Ref<Config>>("config");
const currentConfig = computed(() => config?.value ?? defaultConfig);
const emit = defineEmits(["change"]);
const drag = ref(false);
const dragDepth = ref(0);
const shortcutInput = ref<HTMLInputElement>();

const iconSize = computed(() => {
  const sizes = ["24", "32", "48", "64"];
  if (currentConfig.value.iconSize !== undefined) {
    return sizes[currentConfig.value.iconSize];
  } else {
    return "--";
  }
});

const onKeyDownOnShortcut = async (e: KeyboardEvent) => {
  const shortcut = keyboardEventToElectronAccelerator(e);

  if (shortcut === "" || shortcut === config?.value.shortcuts.toggleCommand) {
    return;
  }

  if (config) {
    await window.ipc.invoke("set:shortcuts", {
      name: "toggleCommand",
      command: shortcut
    });
    emit("change");
  }
};

const onChangeIconSize = async (e: Event) => {
  const size = (e.target as HTMLInputElement).value;
  if (config) {
    await window.ipc.invoke("set:iconSize", Number(size));
    emit("change");
  }
};

const focusShortcutInput = () => {
  shortcutInput.value?.focus();
};

const isFileDrag = (e: DragEvent | Event) => {
  const types = (e as DragEvent).dataTransfer?.types;
  if (!types) {
    return false;
  }
  return Array.from(types).includes("Files");
};

const onDragOver = (e: DragEvent) => {
  if (!isFileDrag(e)) {
    return;
  }
  e.preventDefault();
};

const onDragEnter = (e: DragEvent) => {
  if (!isFileDrag(e)) {
    return;
  }
  e.preventDefault();
  dragDepth.value += 1;
  drag.value = true;
};

const onDragLeave = (e: DragEvent) => {
  if (!isFileDrag(e)) {
    return;
  }
  e.preventDefault();
  dragDepth.value = Math.max(dragDepth.value - 1, 0);
  if (dragDepth.value === 0) {
    drag.value = false;
  }
};

const resetDragState = () => {
  dragDepth.value = 0;
  drag.value = false;
};

const onDrop = async (e: DragEvent | Event) => {
  if (!isFileDrag(e)) {
    return;
  }
  e.preventDefault();
  const file = (e as DragEvent).dataTransfer?.files[0];
  if (file?.name && file.name.split(".").pop() === "app") {
    try {
      const result = await window.ipc.invoke("add:appCommand", {
        path: window.getFilePath(file),
        name: file.name
      });

      if (result?.error) {
        ElMessage.error(result.error);
        return;
      }

      if (result?.warning) {
        ElMessage.warning(result.warning);
      }

      emit("change");
    } catch (error) {
      console.error("[config] Failed to add dragged application", error);
      ElMessage.error("アプリの追加に失敗しました");
    } finally {
      resetDragState();
    }
  } else {
      ElMessage.error("*.app ファイルのみ 追加できます");
      resetDragState();
    }
};

const addDirectory = async () => {
  const result = await window.ipc.invoke("add:directory", {
    name: "New Folder"
  });

  if (result?.error) {
    ElMessage.error(result.error);
  }
  emit("change");
};

const addApplication = async () => {
  try {
    const result = await window.ipc.invoke("add:application");

    if (result?.error) {
      ElMessage.error(result.error);
      return;
    }

    if (result?.warning) {
      ElMessage.warning(result.warning);
    }

    emit("change");
  } catch (error) {
    console.error("[config] Failed to add application", error);
    ElMessage.error("アプリの追加に失敗しました");
  }
};

const onChangeTreeItem = async (tree: AppCommand[]) => {
  if (config) {
    await window.ipc.invoke("set:commands", deepToRaw(tree));
    emit("change");
  }
};
</script>

<template>
  <div class="config">
    <div
      class="config-contents"
      @dragover="onDragOver"
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div class="options">
        <div class="input-field">
          <label for="shortcut">キーボード ショートカット</label>
          <input
            id="shortcut"
            type="text"
            :value="currentConfig.shortcuts.toggleCommand"
            @keydown.prevent="onKeyDownOnShortcut"
            readonly
            @click="focusShortcutInput"
            ref="shortcutInput"
            placeholder="キーの組み合わせを入力してください"
          />
        </div>
        <div class="input-field">
          <label for="icon-size">アイコンサイズ: {{ iconSize }}</label>
          <input
            id="icon-size"
            type="range"
            min="0"
            max="3"
            :value="currentConfig.iconSize"
            @change="onChangeIconSize"
          />
        </div>
      </div>
      <div class="right-side">
        <div class="command-list-container">
          <CommandTree
            @change="onChangeTreeItem"
            class="command-tree"
            :class="{ 'on-filedrag': drag }"
          />
          <div class="empty-state" v-if="currentConfig.commands.length === 0">
            <p>アプリケーションは<br />まだ登録されてないよ</p>
          </div>
        </div>
        <div class="actions">
          <button class="add-application" @click="addApplication">
            <Icon class="icon" icon="mingcute:add-square-line" />
            <span>アプリ追加</span>
          </button>
          <button class="add-directory" @click="addDirectory">
            <Icon class="icon" icon="mingcute:new-folder-line" />
            <span>フォルダ追加</span>
          </button>
        </div>
      </div>
      <div class="on-file-drag-overlay" :class="{ drag }" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.config {
  width: 100%;
  height: 100%;
  background-color: var(--color-black-t800);
  overflow: hidden;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 16px;
}
.config-contents {
  position: relative;
  display: grid;
  grid-template-columns: 200px 1fr;
  overflow-y: auto;
  width: 100%;
  height: 100%;
  padding: 16px;
}
.right-side {
  height: 100%;
  display: grid;
  grid-template-rows: 1fr 48px;
  overflow: hidden;
}
.command-list-container {
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid var(--color-grey-600);

  &.drag {
    border: 1px dashed var(--color-white-t700);
  }
}
.command-tree {
  &.on-filedrag {
    visibility: hidden;
    pointer-events: none;
  }
}
.input-field {
  label {
    color: var(--color-white-50);
    font-size: 12px;
  }
  input {
    width: 100%;
    height: 32px;
    font-size: 14px;
    background-color: var(--color-white-t50);
    border: 1px solid var(--color-white-t400);
    border-radius: 4px;
    color: var(--color-white-50);
    padding: 0 8px;
    &:focus {
      outline: none;
      border-color: var(--color-white-t600);
      background-color: var(--color-white-t100);
    }
  }
}
.actions {
  display: flex;
  width: 100%;
  gap: 8px;
  padding: 8px 0;

  .add-directory,
  .add-application {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-white-t100);
    border: none;
    border-radius: 8px;
    color: var(--color-white-50);
    font-size: 14px;
    padding: 0 12px;
    height: 100%;
    cursor: pointer;
    gap: 4px;
    &:hover {
      background-color: var(--color-white-t200);
    }
  }
}
.empty-state {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white-t500);
  font-size: 14px;
  height: 100%;
}

.on-file-drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-black-t500);
  z-index: 100;
  visibility: hidden;
  pointer-events: none;
  &.drag {
    visibility: visible;
  }
}
</style>
