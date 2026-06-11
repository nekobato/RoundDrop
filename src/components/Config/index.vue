<script setup lang="ts">
import { Ref, computed, inject, ref } from "vue";
import type {
  AppCommand,
  Config,
  WindowSelectionPermission,
  WindowSelectionPermissionCheckResult,
  WindowSelectionToggleResult
} from "@/types/app";
import {
  defaultConfig,
  deepToRaw,
  keyboardEventToElectronAccelerator
} from "@/utils";
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
const isWindowSelectionUpdating = ref(false);
const isWindowSelectionPermissionDialogVisible = ref(false);
const windowSelectionPermissions = ref<WindowSelectionPermission[]>([]);

const iconSize = computed(() => {
  const sizes = ["24", "32", "48", "64"];
  if (currentConfig.value.iconSize !== undefined) {
    return sizes[currentConfig.value.iconSize];
  } else {
    return "--";
  }
});

const isDiagnosticsEnabled = computed(() => {
  return currentConfig.value.diagnostics.enabled;
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

const createWindowSelectionMessage = (result: WindowSelectionToggleResult) => {
  if (!result.error) {
    return undefined;
  }
  return result.logPath ? `${result.error}\n${result.logPath}` : result.error;
};

const getWindowSelectionPermissions = async () => {
  return (await window.ipc.invoke(
    "get:window-selection-permissions"
  )) as WindowSelectionPermissionCheckResult;
};

const applyWindowSelectionToggle = async (enabled: boolean) => {
  const result = (await window.ipc.invoke(
    "set:windowSelectionEnabled",
    enabled
  )) as WindowSelectionToggleResult;
  const errorMessage = createWindowSelectionMessage(result);
  if (errorMessage) {
    ElMessage.error(errorMessage);
  }
  emit("change");
  return result;
};

const onChangeWindowSelectionEnabled = async (e: Event) => {
  if (!config || isWindowSelectionUpdating.value) {
    return;
  }

  const enabled = (e.target as HTMLInputElement).checked;
  if (!enabled) {
    isWindowSelectionUpdating.value = true;
    try {
      await applyWindowSelectionToggle(false);
    } catch (error) {
      console.error("[config] Failed to update window selection setting", error);
      ElMessage.error("ウィンドウ選択機能の設定に失敗しました");
    } finally {
      isWindowSelectionUpdating.value = false;
    }
    return;
  }

  isWindowSelectionUpdating.value = true;
  try {
    const permissions = await getWindowSelectionPermissions();
    windowSelectionPermissions.value = permissions.permissions;
    if (!permissions.granted) {
      isWindowSelectionPermissionDialogVisible.value = true;
      return;
    }

    await applyWindowSelectionToggle(true);
  } catch (error) {
    console.error("[config] Failed to update window selection setting", error);
    ElMessage.error("ウィンドウ選択機能の設定に失敗しました");
  } finally {
    isWindowSelectionUpdating.value = false;
  }
};

const onCancelWindowSelectionPermission = () => {
  isWindowSelectionPermissionDialogVisible.value = false;
};

const onEnableWindowSelectionFromPermissionDialog = async () => {
  if (!config || isWindowSelectionUpdating.value) {
    return;
  }

  isWindowSelectionUpdating.value = true;
  try {
    const permissions = await getWindowSelectionPermissions();
    windowSelectionPermissions.value = permissions.permissions;
    if (!permissions.granted) {
      ElMessage.error("必要な権限が許可されていません");
      return;
    }

    const result = await applyWindowSelectionToggle(true);
    if (result.enabled) {
      isWindowSelectionPermissionDialogVisible.value = false;
    }
  } catch (error) {
    console.error("[config] Failed to enable window selection", error);
    ElMessage.error("ウィンドウ選択機能の有効化に失敗しました");
  } finally {
    isWindowSelectionUpdating.value = false;
  }
};

const onChangeDiagnostics = async (e: Event) => {
  const enabled = (e.target as HTMLInputElement).checked;
  if (config) {
    await window.ipc.invoke("set:diagnostics", { enabled });
    if (enabled && !import.meta.env.VITE_SENTRY_DSN?.trim()) {
      ElMessage.warning("Sentry DSN が未設定です");
    }
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
        const message = result.logPath
          ? `${result.error}\n${result.logPath}`
          : result.error;
        ElMessage.error(message);
        return;
      }

      if (result?.warning) {
        const message = result.logPath
          ? `${result.warning}\n${result.logPath}`
          : result.warning;
        ElMessage.warning(message);
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
      const message = result.logPath
        ? `${result.error}\n${result.logPath}`
        : result.error;
      ElMessage.error(message);
      return;
    }

    if (result?.warning) {
      const message = result.logPath
        ? `${result.warning}\n${result.logPath}`
        : result.warning;
      ElMessage.warning(message);
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
        <div class="input-field switch-field">
          <label for="window-selection-enabled">ウィンドウ選択機能</label>
          <label
            class="toggle-control"
            :class="{ disabled: isWindowSelectionUpdating }"
            for="window-selection-enabled"
          >
            <input
              id="window-selection-enabled"
              type="checkbox"
              role="switch"
              :checked="currentConfig.windowSelectionEnabled"
              :disabled="isWindowSelectionUpdating"
              @change="onChangeWindowSelectionEnabled"
            />
            <span class="toggle-track">
              <span class="toggle-thumb" />
            </span>
          </label>
        </div>
        <div class="input-field diagnostics-field">
          <label class="checkbox-label" for="diagnostics-enabled">
            <input
              id="diagnostics-enabled"
              type="checkbox"
              name="diagnostics-enabled"
              :checked="isDiagnosticsEnabled"
              @change="onChangeDiagnostics"
            />
            <span>匿名の診断データを送信</span>
          </label>
          <p class="field-hint">
            クラッシュ、エラー、主要操作のみ。アプリ名やパスは送信しません。
          </p>
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
    <el-dialog
      v-model="isWindowSelectionPermissionDialogVisible"
      title="権限が必要です"
      width="360px"
      :close-on-click-modal="false"
    >
      <p class="permission-description">
        ウィンドウ選択機能を有効にするには、以下の権限が必要です。
      </p>
      <ul class="permission-list">
        <li
          v-for="permission in windowSelectionPermissions"
          :key="permission.name"
          class="permission-item"
          :class="{ granted: permission.granted }"
        >
          <Icon
            class="permission-icon"
            icon="mingcute:check-circle-fill"
            aria-hidden="true"
          />
          <span>{{ permission.label }}</span>
        </li>
      </ul>
      <template #footer>
        <button
          class="dialog-button secondary"
          type="button"
          @click="onCancelWindowSelectionPermission"
        >
          キャンセル
        </button>
        <button
          class="dialog-button primary"
          type="button"
          :disabled="isWindowSelectionUpdating"
          @click="onEnableWindowSelectionFromPermissionDialog"
        >
          機能を有効にする
        </button>
      </template>
    </el-dialog>
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
  input:not([type="checkbox"]) {
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
.switch-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.toggle-control {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 24px;
  cursor: pointer;

  &.disabled {
    cursor: progress;
    opacity: 0.64;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  input:focus-visible + .toggle-track {
    outline: 2px solid var(--color-white-t700);
    outline-offset: 2px;
  }

  input:checked + .toggle-track {
    background-color: var(--color-teal-500);
  }

  input:checked + .toggle-track .toggle-thumb {
    transform: translateX(20px);
  }
}
.toggle-track {
  display: inline-flex;
  align-items: center;
  width: 44px;
  height: 24px;
  padding: 2px;
  border-radius: 999px;
  background-color: var(--color-grey-600);
  transition: background-color 0.16s ease;
}
.toggle-thumb {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background-color: var(--color-white);
  transition: transform 0.16s ease;
}
.permission-description {
  margin: 0 0 12px;
  color: var(--color-text-body);
  font-size: 14px;
  line-height: 1.5;
}
.permission-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
  line-height: 1.4;
}
.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-error);

  &.granted {
    color: var(--color-success);
  }
}
.permission-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  color: currentColor;
  opacity: 0.4;

  .permission-item.granted & {
    opacity: 1;
  }
}
.dialog-button {
  height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  color: var(--color-white-50);
  cursor: pointer;

  &:disabled {
    cursor: progress;
    opacity: 0.64;
  }

  &.secondary {
    background-color: var(--color-white-t100);
  }

  &.primary {
    background-color: var(--color-teal-500);
  }
}
.diagnostics-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    color: var(--color-white-50);
    cursor: pointer;
    line-height: 1.4;
  }

  input[type="checkbox"] {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    padding: 0;
    accent-color: var(--color-teal-500);
    cursor: pointer;
  }

  .field-hint {
    margin: 0;
    color: var(--color-white-t500);
    font-size: 11px;
    line-height: 1.5;
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
