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
    <div className="mt-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Generated Video</h2>

        <div className="relative rounded-lg overflow-hidden bg-black">
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

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleDownload}
            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            📥 Download
          </button>
          {videoId && onRemix && (
            <button
              onClick={() => onRemix(videoId)}
              className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
              title="Create a variation of this video"
            >
              🎨 Remix
            </button>
          )}
          <button
            onClick={onGenerateNew}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            ✨ Generate New
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Video processed entirely in your browser with FFmpeg.wasm
        </p>
      </div>
    </div>
  );
}
