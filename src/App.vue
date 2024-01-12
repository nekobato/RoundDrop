<script setup lang="ts">
import { onMounted, ref } from "vue";
import RingCommand from "@/components/RingCommand.vue";

const showCommand = ref(false);
const showConfig = ref(false);
const commands = ref([]);

window.ipc.on("ring:open", () => {
  showCommand.value = true;
});

window.ipc.on("ring:close", () => {
  showCommand.value = false;
});

onMounted(async () => {
  commands.value = await window.ipc.invoke("get:commands");
  if (commands.value.length === 0) {
    showConfig.value = true;
  }
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
