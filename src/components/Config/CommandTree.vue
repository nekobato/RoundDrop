<script setup lang="ts">
import { AppCommand, Config } from "@/types/app";
import { ElTree } from "element-plus";
import AppIcon from "@/components/AppIcon.vue";
import type Node from "element-plus/es/components/tree/src/model/node";
import { computed, inject, Ref } from "vue";
import { Icon } from "@iconify/vue";

const config = inject<Ref<Config>>("config");

const commandList = computed(() => {
  return config?.value.commands.map((c) => ({
    id: c.id,
    type: c.type,
    label: c.name,
    children: c.children?.map((cc) => ({
      id: cc.id,
      label: cc.name
    }))
  }));
});

const emit = defineEmits(["change", "remove"]);

const change = (data: Node) => {
  emit("change", data);
};

const remove = (data: AppCommand) => {
  emit("remove", data.id);
};
</script>

<template>
  <ElTree
    class="tree"
    draggable
    default-expand-all
    :check-descendants="false"
    node-key="id"
    @node-drag-end="change"
    :data="commandList"
  >
    <template #default="{ node, data }">
      <div class="tree-node">
        <AppIcon
          v-if="data.type === 'command'"
          class="app-icon"
          :image="'image://image/' + data.id + '.png'"
          :icon-size="1"
        />
        <Icon v-else class="app-icon" icon="mdi:folder" />
        <span class="label">{{ node.label }}</span>
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
  border: 1px solid var(--color-grey-600);
  border-radius: 8px;
  overflow: hidden;
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
