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
</script>

<template>
  <ul class="command-list" v-if="config">
    <li v-for="command in config.commands" :key="command.command">
      <AppIcon
        class="icon"
        :image="command.icon"
        :icon-size="config.iconSize"
      />
      <span class="name">{{ command.name }}</span>
      <button class="delete-button" @click="deleteCommand(command)">
        <Icon class="icon" icon="mingcute:delete-2-line" color="#000000" />
      </button>
    </li>
  </ul>
</template>

<style scoped lang="scss">
ul.command-list {
  list-style: none;
  padding: 8px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: scroll;
  li {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    position: relative;
  }
}
.name {
  margin-left: 8px;
}
.delete-button {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  color: rgba(0, 0, 0, 1);
  border: none;
  cursor: pointer;
  &:hover {
    background-color: rgba(255, 160, 160, 0.8);
  }
  .icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }
}
</style>
