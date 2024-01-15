<script setup lang="ts">
import { Ref, inject } from "vue";
import AppIcon from "./AppIcon.vue";
import { type Config } from "../types/app";

const config = inject<Ref<Config>>("config");
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
    </li>
  </ul>
</template>

<style scoped lang="scss">
ul.command-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  li {
    display: flex;
    align-items: center;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
  }
}
.name {
  margin-left: 8px;
}
</style>
