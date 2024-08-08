<script setup lang="ts">
import { Ref, computed, inject, ref, watch, toRaw } from "vue";
import { Icon } from "@iconify/vue";
import AppIcon from "./AppIcon.vue";
import { AppCommand, type Config } from "../types/app";
import { useSortable } from "@vueuse/integrations/useSortable";

const config = inject<Ref<Config>>("config");
const emit = defineEmits(["change"]);

const sortableElement = ref<HTMLElement | null>(null);
const sortableCommandList = ref<AppCommand[]>(config?.value.commands || []);

const commandList = computed(() => {
  return config?.value.commands || [];
});

useSortable(sortableElement, sortableCommandList, {
  animation: 150
});

const deleteCommand = async (command: AppCommand) => {
  await window.ipc.invoke("delete:command", command.id);
  emit("change");
};

// sortableCommandList側の変更
watch(sortableCommandList, async (newValue) => {
  if (config?.value.commands && newValue !== config?.value.commands) {
    await window.ipc.invoke(
      "set:commands",
      newValue.map((c) => toRaw(c))
    );
    emit("change");
  }
});

// originalのcommandList側の変更
watch(commandList, async () => {
  if (config?.value.commands) {
    sortableCommandList.value = config?.value.commands;
  }
});
</script>

<template>
  <ul class="command-list" v-if="config" ref="sortableElement">
    <li v-for="command in config.commands" :key="command.id">
      <AppIcon
        class="app-icon"
        :image="'image://image/' + command.id + '.png'"
        :icon-size="config.iconSize"
      />
      <span class="name">{{ command.name }}</span>
      <button class="delete-button" @click="deleteCommand(command)">
        <Icon class="icon" icon="mingcute:delete-2-line" />
      </button>
    </li>
  </ul>
</template>

<style scoped lang="scss">
ul.command-list {
  list-style: none;
  padding: 8px 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: scroll;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  li {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    position: relative;
    cursor: grab;
    &:active {
      cursor: grabbing;
    }
    &:hover {
      .delete-button {
        visibility: visible;
      }
      .sort-button-group {
        visibility: visible;
      }
    }
    &.sortable-chosen {
      opacity: 0.4;
    }
  }
}
.name {
  margin-left: 8px;
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
