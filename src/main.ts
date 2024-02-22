import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { initSentry } from "./sentry";

initSentry();
createApp(App).mount("#app");
