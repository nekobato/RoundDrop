<script setup lang="ts">
import { ref } from "vue";
import RingCommand from "./components/RingCommand.vue";

const showCommand = ref(false);

const switchCommand = () => {
  showCommand.value = !showCommand.value;
};
</script>

<template>
  <RingCommand class="ring-command" :visible="showCommand" />
  <button class="button" @click="switchCommand">Command</button>
</template>

<style scoped>
.button {
  position: relative;
}
.ring-command {
  position: absolute;
  top: calc(50% - 160px);
  left: calc(50% - 160px);
}
</style>
