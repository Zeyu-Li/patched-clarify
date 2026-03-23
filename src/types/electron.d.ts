interface ElectronAPI {
  upscaleImage: (fileUrl: string) => Promise<{ upscaledUrl: string }>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
