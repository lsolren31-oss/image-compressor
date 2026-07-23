const imageTool = document.querySelector("#imageTool");
const videoTool = document.querySelector("#videoTool");
const tabButtons = document.querySelectorAll(".tab-button");

const imageFileInput = document.querySelector("#imageFileInput");
const imageDropZone = document.querySelector("#imageDropZone");
const targetSizeInput = document.querySelector("#targetSize");
const imageStatusPanel = document.querySelector("#imageStatusPanel");
const imageStatusText = document.querySelector("#imageStatusText");
const imageResultPanel = document.querySelector("#imageResultPanel");
const originalPreview = document.querySelector("#originalPreview");
const compressedPreview = document.querySelector("#compressedPreview");
const originalSizeEl = document.querySelector("#originalSize");
const compressedSizeEl = document.querySelector("#compressedSize");
const savedRatioEl = document.querySelector("#savedRatio");
const outputInfoEl = document.querySelector("#outputInfo");
const imageDownloadLink = document.querySelector("#imageDownloadLink");
const imageRetryButton = document.querySelector("#imageRetryButton");

const platformSelect = document.querySelector("#platformSelect");
const presetGrid = document.querySelector("#presetGrid");
const customSizePanel = document.querySelector("#customSizePanel");
const customWidth = document.querySelector("#customWidth");
const customHeight = document.querySelector("#customHeight");
const videoFileInput = document.querySelector("#videoFileInput");
const videoDropZone = document.querySelector("#videoDropZone");
const videoStatusPanel = document.querySelector("#videoStatusPanel");
const videoStatusText = document.querySelector("#videoStatusText");
const videoResultPanel = document.querySelector("#videoResultPanel");
const videoOriginalSize = document.querySelector("#videoOriginalSize");
const videoTargetSize = document.querySelector("#videoTargetSize");
const videoFileSize = document.querySelector("#videoFileSize");
const videoOutputInfo = document.querySelector("#videoOutputInfo");
const originalVideoPreview = document.querySelector("#originalVideoPreview");
const convertedVideoPreview = document.querySelector("#convertedVideoPreview");
const videoDownloadLink = document.querySelector("#videoDownloadLink");
const videoRetryButton = document.querySelector("#videoRetryButton");

const FFmpegCoreCDNBase = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
const FFmpegModuleUrl = "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js";
const FFmpegUtilModuleUrl = "https://unpkg.com/@ffmpeg/util@0.12.2/dist/esm/index.js";

const platformPresets = {
  instagram: [
    { label: "方形", ratio: "1:1", width: 1080, height: 1080 },
    { label: "快拍/Reel", ratio: "9:16", width: 1080, height: 1920 },
    { label: "纵向", ratio: "4:5", width: 1080, height: 1350 }
  ],
  tiktok: [{ label: "TikTok", ratio: "9:16", width: 1080, height: 1920 }],
  youtube: [
    { label: "横版", ratio: "16:9", width: 1920, height: 1080 },
    { label: "Shorts", ratio: "9:16", width: 1080, height: 1920 }
  ],
  facebook: [
    { label: "方形", ratio: "1:1", width: 1080, height: 1080 },
    { label: "纵向", ratio: "4:5", width: 1080, height: 1350 },
    { label: "横版", ratio: "16:9", width: 1920, height: 1080 }
  ],
  x: [
    { label: "横版", ratio: "16:9", width: 1920, height: 1080 },
    { label: "方形", ratio: "1:1", width: 1080, height: 1080 }
  ],
  pinterest: [
    { label: "Pin", ratio: "2:3", width: 1000, height: 1500 },
    { label: "Story", ratio: "9:16", width: 1080, height: 1920 }
  ],
  linkedin: [
    { label: "方形", ratio: "1:1", width: 1080, height: 1080 },
    { label: "纵向", ratio: "4:5", width: 1080, height: 1350 },
    { label: "横版", ratio: "16:9", width: 1920, height: 1080 }
  ],
  snapchat: [{ label: "Snapchat", ratio: "9:16", width: 1080, height: 1920 }]
};

let imageOriginalUrl = "";
let imageCompressedUrl = "";
let videoOriginalUrl = "";
let videoConvertedUrl = "";
let selectedPreset = platformPresets.instagram[1];
let ffmpegInstance = null;
let ffmpegLoadingPromise = null;
let ffmpegModulesPromise = null;
let ffmpegProgressHandler = null;

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTool(button.dataset.tool));
});

setupDropZone(imageDropZone, imageFileInput, handleImageFile);
setupDropZone(videoDropZone, videoFileInput, handleVideoFile);

imageRetryButton.addEventListener("click", () => {
  imageFileInput.value = "";
  imageFileInput.click();
});

videoRetryButton.addEventListener("click", () => {
  videoFileInput.value = "";
  videoFileInput.click();
});

platformSelect.addEventListener("change", () => renderPresets());
customWidth.addEventListener("input", updateCustomPreset);
customHeight.addEventListener("input", updateCustomPreset);

renderPresets();

function switchTool(tool) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  imageTool.classList.toggle("hidden", tool !== "image");
  videoTool.classList.toggle("hidden", tool !== "video");
}

function setupDropZone(dropZone, fileInput, handler) {
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
    const [file] = event.dataTransfer.files;
    if (file) {
      handler(file);
    }
  });

  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files;
    if (file) {
      handler(file);
    }
  });
}

function renderPresets() {
  const platform = platformSelect.value;
  customSizePanel.classList.toggle("hidden", platform !== "custom");
  presetGrid.innerHTML = "";

  if (platform === "custom") {
    selectedPreset = getCustomPreset();
    return;
  }

  const presets = platformPresets[platform] || platformPresets.instagram;
  if (!presets.includes(selectedPreset)) {
    selectedPreset = presets[0];
  }

  presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-card";
    button.classList.toggle("active", preset === selectedPreset);
    button.innerHTML = `
      <span class="ratio-box">${preset.ratio}</span>
      <strong>${preset.label}</strong>
      <span>${preset.width} x ${preset.height}</span>
    `;
    button.addEventListener("click", () => {
      selectedPreset = preset;
      renderPresets();
    });
    presetGrid.appendChild(button);
  });
}

function updateCustomPreset() {
  selectedPreset = getCustomPreset();
}

function getCustomPreset() {
  const width = clampEvenNumber(Number(customWidth.value), 120, 7680, 1080);
  const height = clampEvenNumber(Number(customHeight.value), 120, 7680, 1920);
  return {
    label: "自定义",
    ratio: formatRatio(width, height),
    width,
    height
  };
}

async function handleImageFile(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showImageStatus("请上传 JPG、PNG 或 WebP 图片。", true);
    return;
  }

  revokeImageUrls();
  showImageStatus("正在读取图片...", false);
  imageResultPanel.classList.add("hidden");

  try {
    const targetSizeKB = Number(targetSizeInput.value) || 200;
    imageOriginalUrl = URL.createObjectURL(file);
    originalPreview.src = imageOriginalUrl;

    showImageStatus("正在寻找最佳压缩质量...", false);
    const result = await compressImage(file, {
      targetSizeKB,
      maxWidthOrHeight: 1920,
      outputType: "auto",
      minQuality: 0.4,
      maxQuality: 0.95
    });

    imageCompressedUrl = URL.createObjectURL(result.blob);
    compressedPreview.src = imageCompressedUrl;
    imageDownloadLink.href = imageCompressedUrl;
    imageDownloadLink.download = buildImageDownloadName(file.name, result.outputType);

    renderImageResult(file, result);
    imageStatusPanel.classList.add("hidden");
    imageResultPanel.classList.remove("hidden");
  } catch (error) {
    showImageStatus(error.message || "压缩失败，请换一张图片试试。", true);
  }
}

async function compressImage(file, options = {}) {
  const config = {
    targetSizeKB: 200,
    maxWidthOrHeight: 1920,
    outputType: "auto",
    minQuality: 0.4,
    maxQuality: 0.95,
    ...options
  };

  const targetBytes = config.targetSizeKB * 1024;
  const bitmap = await createBitmap(file);
  const originalSizeKB = file.size / 1024;
  const hasTransparency = await imageHasTransparency(bitmap);
  const outputType = chooseOutputType(file.type, config.outputType, hasTransparency);

  if (file.size <= targetBytes) {
    return {
      blob: file,
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      width: bitmap.width,
      height: bitmap.height,
      quality: 1,
      outputType: file.type
    };
  }

  let currentMaxSide = Math.min(
    Math.max(bitmap.width, bitmap.height),
    config.maxWidthOrHeight
  );
  let best = null;

  for (let pass = 0; pass < 12; pass += 1) {
    const { width, height } = containSize(bitmap.width, bitmap.height, currentMaxSide);
    const canvas = drawToCanvas(bitmap, width, height, hasTransparency);
    const candidate = await findBestQuality(canvas, outputType, targetBytes, config);

    if (candidate) {
      best = { ...candidate, width, height };
      break;
    }

    const minBlob = await canvasToBlob(canvas, outputType, config.minQuality);
    best = {
      blob: minBlob,
      compressedSizeKB: minBlob.size / 1024,
      quality: config.minQuality,
      outputType,
      width,
      height
    };

    currentMaxSide = Math.max(320, Math.floor(currentMaxSide * 0.86));
    if (currentMaxSide <= 320 && minBlob.size <= targetBytes) {
      break;
    }
  }

  if (!best) {
    throw new Error("无法压缩这张图片。");
  }

  return {
    blob: best.blob,
    originalSizeKB,
    compressedSizeKB: best.blob.size / 1024,
    width: best.width,
    height: best.height,
    quality: best.quality,
    outputType: best.outputType
  };
}

async function handleVideoFile(file) {
  if (!isSupportedVideo(file)) {
    showVideoStatus("请上传 MP4、WebM 或 MOV 视频。", true);
    return;
  }

  revokeVideoUrls();
  videoResultPanel.classList.add("hidden");
  showVideoStatus("正在读取视频信息...", false);

  try {
    const target = platformSelect.value === "custom" ? getCustomPreset() : selectedPreset;
    const mode = document.querySelector("input[name='resizeMode']:checked").value;
    videoOriginalUrl = URL.createObjectURL(file);
    originalVideoPreview.src = videoOriginalUrl;

    const metadata = await readVideoMetadata(videoOriginalUrl);
    showVideoStatus("正在加载 FFmpeg，首次使用可能需要一点时间...", false);

    const result = await convertVideo(file, {
      width: target.width,
      height: target.height,
      mode,
      outputName: buildVideoOutputName(file.name),
      onProgress: (progress) => {
        const percent = Math.round((progress || 0) * 100);
        showVideoStatus(`正在转换视频... ${percent}%`, false);
      }
    });

    videoConvertedUrl = URL.createObjectURL(result.blob);
    convertedVideoPreview.src = videoConvertedUrl;
    videoDownloadLink.href = videoConvertedUrl;
    videoDownloadLink.download = result.outputName;

    renderVideoResult(file, result, metadata, target, mode);
    videoStatusPanel.classList.add("hidden");
    videoResultPanel.classList.remove("hidden");
  } catch (error) {
    showVideoStatus(
      error.message || "视频转换失败。请尝试较小的视频，或换成 MP4 文件。",
      true
    );
  }
}

async function convertVideo(file, options = {}) {
  const config = {
    width: 1080,
    height: 1920,
    mode: "cover",
    outputName: "converted.mp4",
    onProgress: null,
    ...options
  };

  const ffmpeg = await loadFFmpeg(config.onProgress);
  const inputName = `input-${Date.now()}${getVideoExtension(file.name)}`;
  const outputName = config.outputName || "converted.mp4";
  const filter = buildVideoFilter(config.width, config.height, config.mode);
  const { fetchFile } = await loadFFmpegModules();

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const args = [
    "-i",
    inputName,
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "faststart",
    outputName
  ];

  try {
    await ffmpeg.exec(args);
  } catch (error) {
    await ffmpeg.exec(args.filter((arg) => !["-c:a", "aac", "-b:a", "128k"].includes(arg)));
  }

  const data = await ffmpeg.readFile(outputName);
  await cleanupFFmpegFiles(ffmpeg, [inputName, outputName]);

  return {
    blob: new Blob([data], { type: "video/mp4" }),
    outputName,
    width: config.width,
    height: config.height,
    mode: config.mode,
    outputType: "video/mp4"
  };
}

async function loadFFmpeg(onProgress) {
  ffmpegProgressHandler = onProgress;

  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (!ffmpegLoadingPromise) {
    ffmpegLoadingPromise = (async () => {
      const { FFmpeg, toBlobURL } = await loadFFmpegModules();
      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress }) => {
        if (ffmpegProgressHandler) {
          ffmpegProgressHandler(progress);
        }
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFmpegCoreCDNBase}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFmpegCoreCDNBase}/ffmpeg-core.wasm`, "application/wasm")
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }

  return ffmpegLoadingPromise;
}

async function loadFFmpegModules() {
  if (!ffmpegModulesPromise) {
    ffmpegModulesPromise = Promise.all([
      import(FFmpegModuleUrl),
      import(FFmpegUtilModuleUrl)
    ]).then(([ffmpegModule, utilModule]) => ({
      FFmpeg: ffmpegModule.FFmpeg,
      fetchFile: utilModule.fetchFile,
      toBlobURL: utilModule.toBlobURL
    }));
  }

  return ffmpegModulesPromise;
}

function buildVideoFilter(width, height, mode) {
  if (mode === "stretch") {
    return `scale=${width}:${height}`;
  }

  if (mode === "contain") {
    return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
  }

  return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
}

async function readVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration
      });
    };
    video.onerror = () => reject(new Error("无法读取视频信息。"));
    video.src = url;
  });
}

async function createBitmap(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片读取失败。"));
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageHasTransparency(bitmap) {
  const sampleSize = 64;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  context.clearRect(0, 0, sampleSize, sampleSize);
  context.drawImage(bitmap, 0, 0, sampleSize, sampleSize);

  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 255) {
      return true;
    }
  }
  return false;
}

function chooseOutputType(inputType, requestedType, hasTransparency) {
  if (requestedType && requestedType !== "auto") {
    return requestedType;
  }
  if (hasTransparency) {
    return "image/webp";
  }
  if (inputType === "image/webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

function containSize(width, height, maxSide) {
  const largestSide = Math.max(width, height);
  if (largestSide <= maxSide) {
    return { width, height };
  }

  const scale = maxSide / largestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function drawToCanvas(bitmap, width, height, hasTransparency) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  if (!hasTransparency) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

async function findBestQuality(canvas, outputType, targetBytes, config) {
  let low = config.minQuality;
  let high = config.maxQuality;
  let best = null;

  for (let attempt = 0; attempt < 9; attempt += 1) {
    const quality = (low + high) / 2;
    const blob = await canvasToBlob(canvas, outputType, quality);

    if (blob.size <= targetBytes) {
      best = {
        blob,
        compressedSizeKB: blob.size / 1024,
        quality,
        outputType
      };
      low = quality;
    } else {
      high = quality;
    }
  }

  return best;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("当前浏览器不支持该图片输出格式。"));
        }
      },
      type,
      quality
    );
  });
}

async function cleanupFFmpegFiles(ffmpeg, fileNames) {
  await Promise.all(
    fileNames.map(async (fileName) => {
      try {
        await ffmpeg.deleteFile(fileName);
      } catch {
        // Ignore missing files after a failed conversion path.
      }
    })
  );
}

function renderImageResult(file, result) {
  const savedPercent = Math.max(0, 100 - (result.blob.size / file.size) * 100);
  originalSizeEl.textContent = formatBytes(file.size);
  compressedSizeEl.textContent = formatBytes(result.blob.size);
  savedRatioEl.textContent = `${savedPercent.toFixed(1)}%`;
  outputInfoEl.textContent = `${mimeToLabel(result.outputType)} · ${result.width}x${result.height} · Q${Math.round(result.quality * 100)}`;
}

function renderVideoResult(file, result, metadata, target, mode) {
  videoOriginalSize.textContent = `${metadata.width} x ${metadata.height}`;
  videoTargetSize.textContent = `${target.width} x ${target.height}`;
  videoFileSize.textContent = `${formatBytes(file.size)} → ${formatBytes(result.blob.size)}`;
  videoOutputInfo.textContent = `${formatRatio(target.width, target.height)} · ${modeToLabel(mode)} · MP4`;
}

function showImageStatus(message, isWarning) {
  imageStatusText.textContent = message;
  imageStatusText.classList.toggle("warning", isWarning);
  imageStatusPanel.classList.remove("hidden");
}

function showVideoStatus(message, isWarning) {
  videoStatusText.textContent = message;
  videoStatusText.classList.toggle("warning", isWarning);
  videoStatusPanel.classList.remove("hidden");
}

function formatBytes(bytes) {
  const kb = bytes / 1024;
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(2)} MB`;
  }
  return `${kb.toFixed(1)} KB`;
}

function formatRatio(width, height) {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function mimeToLabel(type) {
  if (type === "image/webp") {
    return "WebP";
  }
  if (type === "image/png") {
    return "PNG";
  }
  return "JPEG";
}

function modeToLabel(mode) {
  if (mode === "contain") {
    return "留白适配";
  }
  if (mode === "stretch") {
    return "拉伸变形";
  }
  return "裁剪铺满";
}

function buildImageDownloadName(fileName, outputType) {
  const extensionByType = {
    "image/webp": "webp",
    "image/png": "png",
    "image/jpeg": "jpg"
  };
  const extension = extensionByType[outputType] || "jpg";
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName || "compressed"}-compressed.${extension}`;
}

function buildVideoOutputName(fileName) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName || "video"}-resized.mp4`;
}

function getVideoExtension(fileName) {
  const match = fileName.match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : ".mp4";
}

function isSupportedVideo(file) {
  const supportedTypes = ["video/mp4", "video/webm", "video/quicktime"];
  return supportedTypes.includes(file.type) || /\.(mp4|webm|mov)$/i.test(file.name);
}

function clampEvenNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const clamped = Math.min(max, Math.max(min, Math.round(value)));
  return clamped % 2 === 0 ? clamped : clamped + 1;
}

function revokeImageUrls() {
  if (imageOriginalUrl) {
    URL.revokeObjectURL(imageOriginalUrl);
  }
  if (imageCompressedUrl) {
    URL.revokeObjectURL(imageCompressedUrl);
  }
  imageOriginalUrl = "";
  imageCompressedUrl = "";
}

function revokeVideoUrls() {
  if (videoOriginalUrl) {
    URL.revokeObjectURL(videoOriginalUrl);
  }
  if (videoConvertedUrl) {
    URL.revokeObjectURL(videoConvertedUrl);
  }
  videoOriginalUrl = "";
  videoConvertedUrl = "";
}

window.compressImage = compressImage;
window.convertVideo = convertVideo;
