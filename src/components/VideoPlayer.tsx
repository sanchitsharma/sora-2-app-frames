import { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface VideoPlayerProps {
  url: string;
  videoId?: string; // OpenAI video ID for remixing
  onGenerateNew: () => void;
  onRemix?: (videoId: string) => void;
}

export function VideoPlayer({ url, videoId, onGenerateNew, onRemix }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (videoRef.current && !playerRef.current) {
      // Initialize Plyr
      playerRef.current = new Plyr(videoRef.current, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'mute',
          'volume',
          'fullscreen',
        ],
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `sora-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mt-10">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10">
        <h2 className="text-3xl font-serif text-gray-900 mb-8" style={{ fontFamily: 'Lora, Georgia, serif' }}>
          Your Video
        </h2>

        <div className="relative rounded-lg overflow-hidden bg-black border border-gray-300">
          <video
            ref={videoRef}
            src={url}
            className="w-full"
            controls
            playsInline
            preload="auto"
            onError={(e) => {
              console.error('Video playback error:', e);
              const video = e.target as HTMLVideoElement;
              console.error('Error code:', video.error?.code, 'Message:', video.error?.message);
            }}
          />
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleDownload}
            className="flex-1 px-8 py-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-all font-medium text-base border border-gray-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            📥 Download
          </button>
          {videoId && onRemix && (
            <button
              onClick={() => onRemix(videoId)}
              className="flex-1 px-8 py-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-all font-medium text-base border border-gray-300"
              title="Create a variation of this video"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              🎨 Remix
            </button>
          )}
          <button
            onClick={onGenerateNew}
            className="flex-1 px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium text-base"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            ✨ Generate New
          </button>
        </div>

        <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 text-center leading-relaxed flex items-center justify-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span>🔒</span>
            Video processed entirely in your browser with FFmpeg.wasm
          </p>
        </div>
      </div>
    </div>
  );
}
