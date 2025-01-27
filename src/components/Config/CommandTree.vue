<script setup lang="ts">
import { AppCommand, Config } from "@/types/app";
import { ElTree } from "element-plus";
import AppIcon from "@/components/AppIcon.vue";
import type Node from "element-plus/es/components/tree/src/model/node";
import { inject, nextTick, ref, Ref } from "vue";
import { Icon } from "@iconify/vue";
import {
  changeName,
  DropType,
  removeAndCapture,
  reorderTree
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
        <AppIcon
          v-if="data.type === 'command'"
          class="app-icon"
          :image="'image://image/' + data.id + '.png'"
          :icon-size="1"
          :type="data.type"
        />
        <Icon v-else class="dir-icon" icon="mingcute:folder-fill" />
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
        <button class="delete-button" @click="remove(data)">
          <Icon class="icon" icon="mingcute:delete-2-line" />
        </button>
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
  justify-content: space-between;
  align-items: center;

  &:hover {
    .delete-button {
      visibility: visible;
    }
  }
}
.label {
  margin: auto auto auto 8px;
  font-size: var(--font-size-16);
}
.label-input {
  margin: 0 auto 0 4px;
  font-size: var(--font-size-16);
}
.dir-icon {
  width: 32px;
  height: 32px;
}

.delete-button {
  visibility: hidden;
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  right: 16px;
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
