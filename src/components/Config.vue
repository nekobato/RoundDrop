<script setup lang="ts">
import { Ref, computed, inject, ref, watch } from "vue";
import { Config } from "@/types/app";
import { keyboardEventToElectronAccelerator } from "@/utils";
import WindowHeader from "./WindowHeader.vue";
import CommandTree from "./Config/CommandTree.vue";
import { Icon } from "@iconify/vue";

// buffer to base64 on browser
const config = inject<Ref<Config>>("config");
const emit = defineEmits(["change", "close"]);
const drag = ref(false);
const shortcutInput = ref<HTMLInputElement>();
const dropAreaErrorMessage = ref("");

const iconSize = computed(() => {
  const sizes = ["24", "32", "48", "64"];
  if (config?.value.iconSize !== undefined) {
    return sizes[config.value.iconSize];
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

const emitChange = () => {
  emit("change");
};

const onExit = () => {
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
      dropAreaErrorMessage.value = result.error;
    }
    drag.value = false;
    emit("change");
  } else {
    dropAreaErrorMessage.value = "Only *.app file is allowed.";
  }
};

const addDirectory = async () => {
  const result = await window.ipc.invoke("add:directory", {
    name: "New Folder"
  });

  if (result?.error) {
    dropAreaErrorMessage.value = result.error;
  }
  emit("change");
};

watch(
  () => dropAreaErrorMessage.value,
  () => {
    setTimeout(() => {
      dropAreaErrorMessage.value = "";
    }, 2000);
  }
);
</script>

<template>
  <div class="config">
    <WindowHeader @exit="onExit" />
    <div class="config-contents">
      <div class="options">
        <div class="input-field">
          <label for="shortcut">リングメニュー開閉ショートカット</label>
          <input
            id="shortcut"
            type="text"
            :value="config?.shortcuts.toggleCommand"
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
            :value="config?.iconSize"
            @change="onChangeIconSize"
          />
        </div>
      </div>
      <div class="right-side">
        <div
          class="command-list-container"
          :class="{ drag }"
          @dragover.prevent="drag = true"
          @dragleave.prevent="drag = false"
          @drop.prevent="onDrop"
        >
          <!-- <ConfigCommandList @change="emitChange" /> -->
          <CommandTree />
          <div class="empty-state" v-if="config?.commands.length === 0">
            <p>アプリケーションは<br />まだ登録されてないよ</p>
          </div>
        </div>
        <div class="list-actions">
          <button class="add-directory" @click="addDirectory">
            <Icon class="icon" icon="mingcute:new-folder-line" />
            <span>フォルダ追加</span>
          </button>
        </div>
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
  grid-template-rows: 32px 1fr;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.8);
  overflow: hidden;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 16px;
}
.config-contents {
  display: grid;
  grid-template-columns: 50% 50%;
  overflow-y: auto;
  width: 100%;
  padding: 16px;
}
.right-side {
  height: 100%;
  display: grid;
  grid-template-rows: 1fr 32px;
}
.command-list-container {
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  flex-shrink: 0;

  &.drag {
    border: 2px dashed rgba(255, 255, 255, 0.5);
  }
}
.input-field {
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
.empty-state {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  height: 100%;
}
</style>
