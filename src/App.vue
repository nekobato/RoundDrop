<script setup lang="ts">
import { ref } from "vue";
import RingCommand from "@/components/RingCommand.vue";

const showCommand = ref(false);

window.ipc.on("ring:open", () => {
  showCommand.value = true;
});

window.ipc.on("ring:close", () => {
  showCommand.value = false;
});
</script>

<template>
  <RingCommand class="ring-command" :visible="showCommand" />
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
