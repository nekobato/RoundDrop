<script setup lang="ts">
import { Ref, inject } from "vue";
import { Icon } from "@iconify/vue";
import AppIcon from "./AppIcon.vue";
import { AppCommand, type Config } from "../types/app";

const config = inject<Ref<Config>>("config");
const emit = defineEmits(["change"]);
const deleteCommand = async (command: AppCommand) => {
  if (config) {
    await window.ipc.invoke("delete:command", command.id);
    emit("change");
  }
};

const onClickUp = async (index: number) => {
  const commands = config?.value.commands;
  if (commands && index > 0) {
    commands.splice(index - 1, 0, commands.splice(index, 1)[0]);
    await window.ipc.invoke("set:commands", commands);
    emit("change");
  }
};

const onClickDown = async (index: number) => {
  const commands = config?.value.commands;
  if (commands && index < commands.length - 1) {
    commands.splice(index, 2, commands[index + 1], commands[index]);
    await window.ipc.invoke("set:commands", commands);
    emit("change");
  }
};
</script>

<template>
  <ul class="command-list" v-if="config">
    <li v-for="(command, index) in config.commands" :key="command.command">
      <AppIcon
        class="app-icon"
        :image="command.icon"
        :icon-size="config.iconSize"
      />
      <span class="name">{{ command.name }}</span>
      <button class="delete-button" @click="deleteCommand(command)">
        <Icon class="icon" icon="mingcute:delete-2-line" />
      </button>
      <div class="sort-button-group">
        <Icon
          class="icon"
          icon="mingcute:up-line"
          @click="onClickUp(index)"
          v-if="index > 0"
        />
        <Icon
          class="icon"
          icon="mingcute:down-line"
          @click="onClickDown(index)"
          v-if="index < config.commands.length - 1"
        />
      </div>
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
    &:hover {
      .delete-button {
        visibility: visible;
      }
      .sort-button-group {
        visibility: visible;
      }
    }
  }
}
.sort-button-group {
  margin: 0 0 0 auto;
  width: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  visibility: hidden;

  > .icon {
    width: 16px;
    height: 16px;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    &:hover {
      color: rgba(255, 255, 255, 0.8);
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
  right: 40px;
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
