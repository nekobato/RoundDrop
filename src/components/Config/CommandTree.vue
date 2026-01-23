<script setup lang="ts">
import { AppCommand, Config } from "@/types/app";
import { ElMessage, ElTree } from "element-plus";
import AppIcon from "@/components/AppIcon.vue";
import type Node from "element-plus/es/components/tree/src/model/node";
import { inject, nextTick, ref, Ref } from "vue";
import { Icon } from "@iconify/vue";
import {
  changeName,
  DropType,
  removeAndCapture,
  reorderTree,
  setIconVersion
} from "./treeUtil";

const config = inject<Ref<Config>>("config");

const emit = defineEmits(["change", "remove"]);

const editingItemId = ref<string>();

const onClickItem = (id: string) => {
  if (editingItemId.value === id) {
    return;
  }
  editingItemId.value = undefined;
};

const onDblClickItem = (id: string) => {
  editingItemId.value = id;
  nextTick(() => {
    const input = document.getElementById("editing-lable-input");
    if (input) {
      input.focus();
    }
  });
};

const onKeyDownOnInput = (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    editingItemId.value = undefined;
  } else if (e.key === "Escape") {
    editingItemId.value = undefined;
  }
};

const onChangeName = (e: Event, id: string) => {
  const target = e.target as HTMLInputElement;
  const currentTree = config?.value.commands;

  if (!currentTree) {
    return;
  }

  const newTree = changeName(currentTree, id, target.value);

  emit("change", newTree);
  editingItemId.value = undefined;
};

const allowDrop = (_: Node, dropNode: Node, type: string) => {
  if (type === "inner" && dropNode.data.type === "command") {
    return false;
  }
  return true;
};

// https://element-plus.org/en-US/component/tree.html#events
const nodeDrop = (node: Node, dropNode: Node, type: DropType) => {
  const currentTree = config?.value.commands;

  if (!currentTree) {
    return;
  }

  const newTree = reorderTree(
    currentTree,
    node.data.id,
    dropNode.data.id,
    type
  );

  emit("change", newTree);
};

const remove = async (data: AppCommand) => {
  const currentTree = config?.value.commands;

  if (!currentTree) {
    return;
  }

  const { newTree } = removeAndCapture(currentTree, data.id);
  emit("change", newTree);
  await window.ipc.invoke("remove:commandImage", data.id);
};

const createIconSrc = (data: AppCommand) => {
  if (data.type === "command") {
    return `image://image/${data.id}.png`;
  }
  if (typeof data.iconVersion === "number") {
    return `image://image/${data.id}.png?v=${data.iconVersion}`;
  }
  return undefined;
};

const setGroupIcon = async (id: string) => {
  const currentTree = config?.value.commands;

  if (!currentTree) {
    return;
  }

  const result = await window.ipc.invoke("set:groupIcon", { id });

  if (result?.canceled) {
    return;
  }

  if (result?.error) {
    ElMessage.error(result.error);
    return;
  }

  const iconVersion =
    typeof result?.updatedAt === "number" ? result.updatedAt : Date.now();
  const newTree = setIconVersion(currentTree, id, iconVersion);
  emit("change", newTree);
};

const resetGroupIcon = async (id: string) => {
  const currentTree = config?.value.commands;

  if (!currentTree) {
    return;
  }

  await window.ipc.invoke("remove:commandImage", id);
  const newTree = setIconVersion(currentTree, id, undefined);
  emit("change", newTree);
};
</script>

<template>
  <ElTree
    class="tree"
    draggable
    default-expand-all
    :check-descendants="false"
    node-key="id"
    :data="config?.commands"
    :allow-drop="allowDrop"
    @node-drop="nodeDrop"
  >
    <template #default="{ data }: { data: AppCommand }">
      <div class="tree-node" @click="onClickItem(data.id)">
        <div class="node-main">
          <AppIcon
            class="app-icon"
            :image="createIconSrc(data)"
            :icon-size="1"
            :type="data.type"
          />
          <input
            id="editing-lable-input"
            class="label-input"
            v-if="editingItemId === data.id"
            type="text"
            v-model="data.name"
            @change="onChangeName($event, data.id)"
            @keydown="onKeyDownOnInput"
          />
          <span v-else class="label" @dblclick="onDblClickItem(data.id)">{{
            data.name
          }}</span>
        </div>
        <div class="actions">
          <button
            v-if="data.type === 'group'"
            class="action-button"
            @click.stop="setGroupIcon(data.id)"
          >
            アイコン変更
          </button>
          <button
            v-if="data.type === 'group'"
            class="action-button"
            @click.stop="resetGroupIcon(data.id)"
          >
            リセット
          </button>
          <button class="delete-button" @click.stop="remove(data)">
            <Icon class="icon" icon="mingcute:delete-2-line" />
          </button>
        </div>
      </div>
    </template>
  </ElTree>
</template>

<style scoped lang="scss">
.tree {
  width: 100%;
  height: 100%;
  :deep(.el-icon) {
    padding: 18px 8px 18px 4px;
  }
  :deep(.el-tree-node__content) {
    height: 48px;
  }
}
.tree-node {
  display: flex;
  width: 100%;
  align-items: center;

  &:hover {
    .actions {
      visibility: visible;
    }
  }
}
.node-main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.label {
  margin: auto auto auto 8px;
  font-size: var(--font-size-16);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.label-input {
  margin: 0 auto 0 4px;
  font-size: var(--font-size-16);
  width: 100%;
}
.actions {
  visibility: hidden;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-right: 16px;
}

.action-button {
  font-size: var(--font-size-12);
  color: rgba(255, 255, 255, 0.6);
  background-color: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }
}

.delete-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    .icon {
      color: rgba(255, 166, 166, 0.8);
    }
  }
  .icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: rgba(255, 255, 255, 0.5);
  }
}
</style>
