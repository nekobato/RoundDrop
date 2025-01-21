import { createApp } from "vue";
import App from "./App.vue";
import { initSentry } from "./sentry";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "./styles/index.scss";

initSentry();
createApp(App).use(ElementPlus).mount("#app");
