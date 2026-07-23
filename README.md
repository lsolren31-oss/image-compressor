# 媒体处理工具

一个纯浏览器端运行的媒体处理工具。图片和视频都在本地处理，不会上传到服务器。

## 功能

### 图片压缩

- 支持 JPG、PNG、WebP
- 默认压缩到 200KB 以下
- 自动寻找尽量高的压缩质量
- 必要时按比例降低分辨率以满足目标大小
- 支持原图和压缩图预览
- 支持下载压缩后的图片

### 视频尺寸转换

- 支持 MP4、WebM、MOV
- 支持 Instagram、TikTok、YouTube、Facebook、X / Twitter、Pinterest、LinkedIn、Snapchat 常用尺寸
- 支持自定义宽高
- 支持裁剪铺满、留白适配、拉伸变形
- 默认输出 MP4
- 使用 ffmpeg.wasm 在浏览器本地转换

## 使用

直接用浏览器打开 `index.html`，选择图片或视频即可。

也可以部署到 GitHub Pages，入口文件就是 `index.html`。

视频功能首次使用时会从 CDN 加载 FFmpeg，加载完成后再开始转换。
