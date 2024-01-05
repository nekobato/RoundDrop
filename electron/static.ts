import { app } from "electron";
import * as path from "path";

process.env.ROOT = path.join(__dirname, "..");
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

export const preload = path.join(__dirname, "preload.js");

export const pageRoot = VITE_DEV_SERVER_URL
  ? (VITE_DEV_SERVER_URL as string) // dev
  : path.join(process.env.DIST, "index.html"); // prod

export const publicRoot = process.env.VITE_PUBLIC;
