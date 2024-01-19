<script setup lang="ts">
import { Ref, inject, ref } from "vue";
import { Icon } from "@iconify/vue";
import ConfigCommandList from "./ConfigCommandList.vue";
import { Config } from "@/types/app";
import { keyboardEventToElectronAccelerator } from "@/utils";

// buffer to base64 on browser
const config = inject<Ref<Config>>("config");
const emit = defineEmits(["change", "close"]);
const drag = ref(false);
const shortcutInput = ref<HTMLInputElement>();

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

const emitChange = () => {
  emit("change");
};

const closeConfig = () => {
  emit("close");
};

const focusShortcutInput = () => {
  shortcutInput.value?.focus();
};

const onDrop = async (e: DragEvent | Event) => {
  e.preventDefault();
  const file = (e as DragEvent).dataTransfer?.files[0];
  if (file?.path && file.path.split(".").pop() === "app") {
    const result = await window.ipc.invoke("add:appCommand", {
      name: file.name,
      appPath: file.path
    });
    if (result?.error) {
      console.error(result.error);
    }
    drag.value = false;
    emit("change");
  }
};
</script>

<template>
  <div class="config">
    <div class="header">
      <button class="close-button" @click="closeConfig">
        <Icon icon="mingcute:close-fill" color="#ffffff" />
      </button>
    </div>
    <div class="config-contents">
      <div class="options">
        <div class="input-field">
          <label for="shortcut">リング呼び出し/戻しショートカット</label>
          <input
            id="shortcut"
            type="text"
            :value="config?.shortcuts.toggleCommand"
            @keydown.prevent="onKeyDownOnShortcut"
            readonly
            @click="focusShortcutInput"
            ref="shortcutInput"
          />
        </div>
        <div class="input-field">
          <label for="icon-size">アイコンサイズ: {{}}</label>
          <input
            id="icon-size"
            type="range"
            min="0"
            max="3"
            :value="config?.iconSize"
            @change="onChangeIconSize"
          />
        </div>
      </div>
      <div class="command-list-container">
        <div
          class="drop-area"
          :class="{ drag }"
          @dragover.prevent="drag = true"
          @dragleave.prevent="drag = false"
          @drop.prevent="onDrop"
        >
          <!-- <input class="input" type="file" ref="fileInput" @change="onDrop" /> -->
          <p>Drop your app here</p>
        </div>
        <ConfigCommandList @change="emitChange" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.config {
  width: 640px;
  height: 480px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: grid;
  grid-template-rows: 24px 1fr;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.5);
}
.close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 24px;
  background-color: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
}
.config-contents {
  display: grid;
  grid-template-columns: 50% 50%;
  overflow-y: auto;
}
.command-list-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: scroll;
}
.drop-area {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.2);
  border: 2px dashed rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  &.drag {
    border-color: rgba(255, 255, 255, 1);
  }
  .input {
    display: none;
  }
}
.input-field {
  padding: 8px;
  label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
  }
  input {
    width: 100%;
    height: 32px;
    font-size: 14px;
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.8);
    padding: 0 8px;
    &:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.8);
    }
  }
}
</style>
