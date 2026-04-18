import Head from "next/head";
import { useState, useRef, useCallback } from "react";
import { Upload, Download, ArrowLeftRight, ImagePlus } from "lucide-react";
import Upscaler from "upscaler";
import model2x from "@upscalerjs/esrgan-medium/2x";
import model3x from "@upscalerjs/esrgan-medium/3x";
import model4x from "@upscalerjs/esrgan-medium/4x";
import model8x from "@upscalerjs/esrgan-medium/8x";
import { Button, buttonVariants } from "~/components/ui/button";

const SCALE_OPTIONS = [2, 3, 4, 8] as const;
type Scale = (typeof SCALE_OPTIONS)[number];

const models: Record<Scale, typeof model2x> = {
  2: model2x,
  3: model3x,
  4: model4x,
  8: model8x,
};

export default function Home() {
  const [upscaledFile, setUpscaledFile] = useState("");
  const [originalImage, setOriginalImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [scale, setScale] = useState<Scale>(2);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const upscaleFromFile = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setOriginalImage(localUrl);
    setIsLoading(true);
    setError("");

    let upscaler: InstanceType<typeof Upscaler> | null = null;
    try {
      const img = new Image();
      img.src = localUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      upscaler = new Upscaler({ model: models[scale] });
      const upscaledBase64 = await upscaler.upscale(img, {
        patchSize: 512,
        padding: 4,
      });
      setUpscaledFile(upscaledBase64);
    } catch (err) {
      console.error("Upscale failed:", err);
      setError(err instanceof Error ? err.message : "Upscaling failed");
    } finally {
      upscaler?.dispose();
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upscaleFromFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      upscaleFromFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleNewImage = () => {
    if (originalImage) URL.revokeObjectURL(originalImage);
    setUpscaledFile("");
    setOriginalImage("");
    setShowOriginal(false);
    setImageSize(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <Head>
        <title>Clarify</title>
        <meta name="description" content="Clarify your images" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-50 sm:text-[5rem]">
            Clarify Images Using AI
          </h1>

          {!upscaledFile && !isLoading && (
            <>
              <div className="flex w-full max-w-2xl flex-col items-center gap-4">
                <label className="text-sm font-medium text-slate-400">
                  Scale Factor
                </label>
                <div className="flex w-full max-w-sm flex-col items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={SCALE_OPTIONS.length - 1}
                    step={1}
                    value={SCALE_OPTIONS.indexOf(scale)}
                    onChange={(e) =>
                      setScale(SCALE_OPTIONS[Number(e.target.value)]!)
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-teal-500"
                  />
                  <div className="flex w-full justify-between px-1">
                    {SCALE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setScale(s)}
                        className={`text-sm font-medium transition ${
                          scale === s
                            ? "text-teal-400"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 transition ${
                  isDragging
                    ? "border-teal-400 bg-teal-400/10"
                    : "border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800"
                }`}
              >
                <Upload className="h-12 w-12 text-slate-400" />
                <p className="text-lg text-slate-300">
                  Drag and drop an image, or click to browse
                </p>
                <p className="text-sm text-slate-500">
                  PNG, JPG, WebP supported
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </>
          )}

          {isLoading && (
            <h2 className="m-4 text-center text-2xl text-slate-300">
              Upscaling image ({scale}x)...
            </h2>
          )}

          {error && (
            <p className="text-center text-red-400">{error}</p>
          )}

          {upscaledFile && (
            <div className="flex flex-col items-center gap-6">
              <div
                className="relative flex items-center justify-center"
                style={
                  imageSize
                    ? {
                        width: imageSize.width,
                        height: imageSize.height,
                        maxHeight: "60vh",
                        aspectRatio: `${imageSize.width} / ${imageSize.height}`,
                      }
                    : undefined
                }
              >
                <img
                  src={showOriginal ? originalImage : upscaledFile}
                  className="max-h-[60vh] max-w-full rounded-lg object-contain"
                  alt={showOriginal ? "Original Image" : "Upscaled Image"}
                  onLoad={(e) => {
                    if (!imageSize) {
                      const img = e.currentTarget;
                      setImageSize({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }
                  }}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  {showOriginal ? "Show Upscaled" : "Show Original"}
                </Button>
                <a
                  href={upscaledFile}
                  download="clarify-upscaled.png"
                  className={buttonVariants()}
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <Button variant="secondary" onClick={handleNewImage}>
                  <ImagePlus className="h-4 w-4" />
                  New Image
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
