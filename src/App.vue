<script setup lang="ts">
import { onMounted, ref, provide } from "vue";
import Ring from "@/components/Ring.vue";
import Config from "./components/Config/index.vue";
import { defaultConfig } from "./utils";

const isConfigWindow =
  new URLSearchParams(window.location.search).get("window") === "config";

const config = ref(defaultConfig);
const runningApps = ref<Record<string, boolean>>({});
provide("config", config);
provide("runningApps", runningApps);
const showCommand = ref(false);

const applyRunningApps = (payload?: Record<string, boolean>) => {
  runningApps.value = payload ?? {};
};

const onChangeConfig = async () => {
  config.value = await window.ipc.invoke("get:config");
};

if (!isConfigWindow) {
  window.ipc.on("ring:open", () => {
    showCommand.value = true;
  });

  window.ipc.on("ring:close", () => {
    showCommand.value = false;
  });

  window.ipc.on("running-apps:update", (_, payload: Record<string, boolean>) => {
    applyRunningApps(payload);
  });
}

window.ipc.on("config:updated", () => {
  onChangeConfig();
});

onMounted(async () => {
  window.postMessage("removeLoading");

  await onChangeConfig();
  if (!isConfigWindow && config.value.commands.length === 0) {
    window.ipc.send("config:open");
  }

  if (!isConfigWindow) {
    const initialRunningApps = await window.ipc.invoke("get:running-apps");
    applyRunningApps(initialRunningApps);
  }

  window.removeLoading();
});
</script>

<template>
  <div class="scrim" v-if="!isConfigWindow && showCommand" />
  <Ring
    class="ring-command"
    :visible="showCommand"
    v-if="!isConfigWindow && config.commands.length > 0"
  />
  <Config class="config" v-if="isConfigWindow" @change="onChangeConfig" />
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
