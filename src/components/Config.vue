<script setup lang="ts">
import { Ref, inject, ref } from "vue";
import ConfigCommandList from "./ConfigCommandList.vue";
import { Config } from "@/types/app";

// buffer to base64 on browser
const config = inject<Ref<Config>>("config");
const emit = defineEmits(["change"]);
const drag = ref(false);

const onDrop = async (e: DragEvent | Event) => {
  e.preventDefault();
  const file = (e as DragEvent).dataTransfer?.files[0];
  if (file?.path && file.path.split(".").pop() === "app") {
    await window.ipc.invoke("add:appCommand", {
      name: file.name,
      appPath: file.path,
    });
    emit("change");
  }
};
</script>

<template>
  <div class="config">
    <div class="options">
      <div class="input-field">
        <label for="shortcut">リング呼び出し/戻しショートカット</label>
        <input
          id="shortcut"
          type="text"
          :value="config?.shortcuts.toggleCommand"
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
        <input
          class="input"
          type="file"
          accept=".app"
          ref="fileInput"
          @change="onDrop"
        />
        <p>Drop your app here</p>
      </div>
      <ConfigCommandList />
    </div>
  </div>
</template>

<style scoped lang="scss">
.config {
  width: 640px;
  height: 480px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: grid;
  grid-template-columns: 50% 50%;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.5);
}
.command-list-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
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
