import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const isDev = !app.isPackaged;

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3456");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "out", "index.html"));
  }
}

ipcMain.handle(
  "upscale-image",
  async (_event: Electron.IpcMainInvokeEvent, fileUrl: string) => {
    const apiKey = process.env.REPLICATE_API_KEY;
    if (!apiKey) {
      throw new Error("REPLICATE_API_KEY is not set");
    }

    const startResponse = await fetch(
      "https://api.replicate.com/v1/predictions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Token " + apiKey,
        },
        body: JSON.stringify({
          version:
            "4f7eb3da655b5182e559d50a0437440f242992d47e5e20bd82829a79dee61ff3",
          input: { image: fileUrl, version: "v1.4", scale: 2 },
        }),
      },
    );

    const jsonStartRes = (await startResponse.json()) as {
      urls: { get: string };
    };
    const endpointUrl = jsonStartRes.urls.get;

    let newFileUrl: string | null = null;
    let counter = 0;
    const maxPoll = 120;

    while (!newFileUrl) {
      if (counter > maxPoll) {
        throw new Error("Upscaling timed out");
      }

      console.log(`Polling results at count = ${counter + 1}`);

      const finalResponse = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Token " + apiKey,
        },
      });
      const jsonFinalResponse = (await finalResponse.json()) as {
        status: string;
        output: string;
      };

      if (jsonFinalResponse.status === "succeeded") {
        newFileUrl = jsonFinalResponse.output;
      } else if (jsonFinalResponse.status === "failed") {
        throw new Error("Upscaling failed");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      counter++;
    }

    return { upscaledUrl: newFileUrl };
  },
);

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error("Auto-update check failed:", err);
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
