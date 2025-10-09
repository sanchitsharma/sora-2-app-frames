# Sora Video Generation - Frontend App

A frontend-heavy web application for generating AI videos with OpenAI Sora 2. Built with React, TypeScript, FFmpeg.wasm, and Vercel Edge Functions.

## Features

- **Client-Side Video Processing**: All video concatenation happens in your browser using FFmpeg.wasm
- **Privacy-First**: Your API key is stored in sessionStorage and videos never leave your device
- **Zero Backend Infrastructure**: Minimal serverless Edge Functions for CORS proxy only
- **Real-Time Progress**: Live progress tracking for each video segment
- **Mobile Detection**: Automatic warnings for mobile devices
- **Memory Management**: Built-in memory estimation and warnings
- **Modern UI**: Beautiful, responsive interface with Tailwind CSS

## Tech Stack

- **React 19** + **TypeScript**
- **Zustand** - Lightweight state management
- **FFmpeg.wasm** - Client-side video processing
- **Plyr** - Video player
- **TailwindCSS** - Styling
- **Vercel Edge Functions** - Serverless CORS proxy

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build

```bash
npm run build
```

### Usage

1. Enter your OpenAI API key (starts with `sk-`)
2. Write your video prompt
3. Configure video settings (duration, segments, size)
4. Click "Generate Video"
5. Wait for generation and concatenation
6. Preview and download!

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
- **No databases**, no Redis, no backend infrastructure!

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

## Troubleshooting

**FFmpeg won't load**: Check COOP/COEP headers in vercel.json
**API key not saving**: Not in private/incognito mode?
**Videos fail**: Verify Sora 2 API access
**Browser crashes**: Reduce segments or use 720p

## License

MIT
