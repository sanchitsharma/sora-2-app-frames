# 🎬 Sora Video Generator

> An open-source, privacy-first web application for generating AI videos with OpenAI Sora 2

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

A beautiful, frontend-heavy web application that lets you generate stunning AI videos with OpenAI Sora 2. All video processing happens in your browser - no server uploads, no data collection.

## ✨ Features

- **🎨 AI Prompt Planning**: Get AI-generated segment plans for complex video sequences
- **🎞️ Frame Continuity**: Automatic frame-to-frame continuity between segments using `input_reference` from Sora 2 API
- **📐 Multiple Aspect Ratios**: Landscape (16:9) and Portrait (9:16) formats with standard and Pro resolutions
- **🔒 Privacy-First**: Your API key and videos never leave your device
- **⚡ Client-Side Processing**: All video concatenation happens in your browser using FFmpeg.wasm
- **🎯 Zero Backend**: Minimal serverless Edge Functions for CORS proxy only
- **📊 Real-Time Progress**: Live progress tracking for each video segment
- **📱 Mobile Detection**: Automatic warnings for mobile devices with memory limits
- **💾 Memory Management**: Built-in memory estimation and warnings
- **🎭 Modern UI**: Beautiful, responsive interface with glassmorphism effects and smooth animations

## Tech Stack

- **React 19** + **TypeScript**
- **Zustand** - Lightweight state management
- **FFmpeg.wasm** - Client-side video processing
- **HTML5 Canvas API** - Frame extraction for continuity
- **Axios** - HTTP client with multipart/form-data support
- **Plyr** - Video player
- **TailwindCSS v4** - Modern styling with glassmorphism effects
- **Vercel Edge Functions** - Serverless CORS proxy

## Getting Started

### Installation

```bash
npm install
```

### Development

For full functionality with Edge Functions (required for API proxying):

```bash
npm run dev:vercel
```

For basic frontend development only:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Note**: You must use `npm run dev:vercel` to test video generation, as it requires Vercel Edge Functions for the CORS proxy.

### Build

```bash
npm run build
```

### Usage

1. **Enter your OpenAI API key** (starts with `sk-proj-`)
2. **Choose generation mode**:
   - **Quick Generate**: Use a single prompt for all segments
   - **🎨 Plan with AI**: Get AI-generated segment breakdowns for complex videos
3. **Write your video prompt** - Be creative and descriptive!
4. **Configure video settings**:
   - **Segment Duration**: 4, 8, or 12 seconds per segment
   - **Number of Segments**: 1-10 segments (total duration = duration × segments)
   - **Resolution & Orientation**:
     - Landscape: 720p (1280x720) or 1024p Pro (1792x1024)
     - Portrait: 720x1280 or 1024x1792 (Pro)
5. **Generate your video** - Watch real-time progress for each segment
6. **Preview, download, or generate new!**

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Your app will be live at `https://your-app.vercel.app`

## Architecture

```
Browser → sessionStorage → Edge Function → OpenAI API → Browser → FFmpeg.wasm → Download
```

- **Edge Functions** handle CORS (simple pass-through proxy)
- **FFmpeg.wasm** concatenates videos in the browser
- **Frame Extraction** uses HTML5 Canvas API to extract last frame from each segment
- **Frame Continuity** passes extracted frames as `input_reference` to subsequent segments
- **No databases**, no Redis, no backend infrastructure!

### How Frame Continuity Works

1. **First Segment**: Generated without any reference frame
2. **Extract Frame**: After downloading each segment (except the last), the last frame is extracted using Canvas API
3. **Next Segment**: The extracted frame is passed as `input_reference` to ensure visual continuity
4. **Result**: Smooth transitions between video segments, mimicking a single continuous video

This technique is inspired by the [Sora 2 API documentation](https://platform.openai.com/docs/guides/video) and ensures professional-looking extended videos.

## Security

- API keys stored in sessionStorage (cleared on tab close)
- Videos processed locally (never uploaded)
- HTTPS only
- COOP/COEP headers for SharedArrayBuffer

## Limitations

- Desktop browsers recommended (mobile has memory limits)
- Max 10 segments
- Memory warning at 1.5GB
- FFmpeg takes 5-10s to load initially

## Technical Implementation

### Frame Continuity Pipeline

The app implements Sora 2's frame continuity feature for seamless video transitions:

**Key Files:**
- `src/utils/videoFrameExtractor.ts` - Extracts last frame using Canvas API
- `src/services/openaiService.ts` - Handles multipart/form-data for image uploads
- `api/proxy-create-video.ts` - Edge Function supporting both JSON and FormData
- `src/App.tsx` - Orchestrates the frame extraction and continuity flow

**Flow:**
1. Download completed video segment as Blob
2. Create HTML5 `<video>` element and load the blob
3. Seek to last frame (duration - 0.1s)
4. Draw frame to Canvas with matching dimensions
5. Convert Canvas to JPEG Blob (95% quality)
6. Pass Blob as `inputReference` to next segment's API call
7. Edge Function forwards as `input_reference` in multipart/form-data

**Performance:**
- Frame extraction takes ~100-500ms per video
- JPEG compression maintains high quality at smaller size
- Canvas operations are GPU-accelerated in modern browsers

### Sora 2 API Integration

The app uses these Sora 2 endpoints:
- `POST /v1/videos` - Create video generation job (supports `input_reference`)
- `GET /v1/videos/{id}` - Poll job status and progress
- `GET /v1/videos/{id}/content` - Download completed video

**Supported Parameters:**
- `model`: `sora-2` or `sora-2-pro`
- `seconds`: `"4"`, `"8"`, or `"12"` (string format required)
- `size`: Landscape (1280x720, 1792x1024) or Portrait (720x1280, 1024x1792)
- `input_reference`: Image blob for frame continuity (multipart/form-data)

## Troubleshooting

**FFmpeg won't load**: Check COOP/COEP headers in vercel.json
**API key not saving**: Not in private/incognito mode?
**Videos fail**: Verify Sora 2 API access
**Browser crashes**: Reduce segments or use 720p
**Frame extraction fails**: Ensure browser supports Canvas API (all modern browsers do)

## 🤝 Contributing

We welcome contributions! This is an open-source project, and we'd love your help to make it better.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [OpenAI Sora 2](https://openai.com/sora/) API
- Video processing powered by [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- UI components inspired by modern design principles

## 📧 Support

- **Issues**: Found a bug? [Open an issue](../../issues)
- **Discussions**: Have questions? [Start a discussion](../../discussions)
- **Twitter**: Follow for updates

## ⭐ Star History

If you find this project useful, please consider giving it a star! It helps others discover the project.

---

**Made with ❤️ by the open source community**
