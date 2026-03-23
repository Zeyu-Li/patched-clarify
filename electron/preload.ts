import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  upscaleImage: (fileUrl: string) =>
    ipcRenderer.invoke("upscale-image", fileUrl),
});
