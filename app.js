const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const targetSizeInput = document.querySelector("#targetSize");
const statusPanel = document.querySelector("#statusPanel");
const statusText = document.querySelector("#statusText");
const resultPanel = document.querySelector("#resultPanel");
const originalPreview = document.querySelector("#originalPreview");
const compressedPreview = document.querySelector("#compressedPreview");
const originalSizeEl = document.querySelector("#originalSize");
const compressedSizeEl = document.querySelector("#compressedSize");
const savedRatioEl = document.querySelector("#savedRatio");
const outputInfoEl = document.querySelector("#outputInfo");
const downloadLink = document.querySelector("#downloadLink");
const retryButton = document.querySelector("#retryButton");

let originalUrl = "";
let compressedUrl = "";

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
    handleFile(file);
  }
});

fileInput.addEventListener("change", () => {
  const [file] = fileInput.files;
  if (file) {
    handleFile(file);
  }
});

retryButton.addEventListener("click", () => {
  fileInput.value = "";
  fileInput.click();
});

async function handleFile(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showStatus("请上传 JPG、PNG 或 WebP 图片。", true);
    return;
  }

  revokeUrls();
  showStatus("正在读取图片...", false);
  resultPanel.classList.add("hidden");

  try {
    const targetSizeKB = Number(targetSizeInput.value) || 200;
    originalUrl = URL.createObjectURL(file);
    originalPreview.src = originalUrl;

    showStatus("正在寻找最佳压缩质量...", false);
    const result = await compressImage(file, {
      targetSizeKB,
      maxWidthOrHeight: 1920,
      outputType: "auto",
      minQuality: 0.4,
      maxQuality: 0.95
    });

    compressedUrl = URL.createObjectURL(result.blob);
    compressedPreview.src = compressedUrl;
    downloadLink.href = compressedUrl;
    downloadLink.download = buildDownloadName(file.name, result.outputType);

    renderResult(file, result);
    statusPanel.classList.add("hidden");
    resultPanel.classList.remove("hidden");
  } catch (error) {
    showStatus(error.message || "压缩失败，请换一张图片试试。", true);
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
      best = {
        ...candidate,
        width,
        height
      };
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

function renderResult(file, result) {
  const savedPercent = Math.max(0, 100 - (result.blob.size / file.size) * 100);
  originalSizeEl.textContent = formatKB(file.size / 1024);
  compressedSizeEl.textContent = formatKB(result.compressedSizeKB);
  savedRatioEl.textContent = `${savedPercent.toFixed(1)}%`;
  outputInfoEl.textContent = `${mimeToLabel(result.outputType)} · ${result.width}x${result.height} · Q${Math.round(result.quality * 100)}`;
}

function showStatus(message, isWarning) {
  statusText.textContent = message;
  statusText.classList.toggle("warning", isWarning);
  statusPanel.classList.remove("hidden");
}

function formatKB(value) {
  if (value >= 1024) {
    return `${(value / 1024).toFixed(2)} MB`;
  }
  return `${value.toFixed(1)} KB`;
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

function buildDownloadName(fileName, outputType) {
  const extensionByType = {
    "image/webp": "webp",
    "image/png": "png",
    "image/jpeg": "jpg"
  };
  const extension = extensionByType[outputType] || "jpg";
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName || "compressed"}-compressed.${extension}`;
}

function revokeUrls() {
  if (originalUrl) {
    URL.revokeObjectURL(originalUrl);
  }
  if (compressedUrl) {
    URL.revokeObjectURL(compressedUrl);
  }
  originalUrl = "";
  compressedUrl = "";
}

window.compressImage = compressImage;
