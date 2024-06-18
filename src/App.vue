<script setup lang="ts">
import { onMounted, ref, provide } from "vue";
import RoundDrop from "@/components/Ring.vue";
import Config from "./components/Config.vue";
import { defaultConfig } from "./utils";

const config = ref(defaultConfig);
provide("config", config);
const showCommand = ref(false);
const showConfig = ref(false);

const onChangeConfig = async () => {
  config.value = await window.ipc.invoke("get:config");
};

const closeConfig = () => {
  window.ipc.send("config:close");
  showConfig.value = false;
};

window.ipc.on("ring:open", () => {
  showCommand.value = true;
});

window.ipc.on("ring:close", () => {
  showCommand.value = false;
});

window.ipc.on("ring:config", () => {
  showCommand.value = false;
  showConfig.value = true;
});

onMounted(async () => {
  window.postMessage("removeLoading");

  config.value = await window.ipc.invoke("get:config");
  console.log(config.value);
  if (config.value.commands.length === 0) {
    window.ipc.send("config:open");
    showConfig.value = true;
  }

  window.removeLoading();
});
</script>

<template>
  <div class="scrim" v-if="showCommand" />
  <RoundDrop
    class="ring-command"
    :visible="showCommand"
    :no-transition="showConfig"
  />
  <Config
    class="config"
    v-if="showConfig"
    @change="onChangeConfig"
    @close="closeConfig"
  />
</template>

<style scoped>
.scrim {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s ease-in-out;
}
.ring-command {
  position: absolute;
  top: calc(50% - 160px);
  left: calc(50% - 160px);
}
.config {
  position: relative;
  margin: auto;
}
</style>
