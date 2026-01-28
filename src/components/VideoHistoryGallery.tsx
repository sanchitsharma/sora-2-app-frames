import { useState } from 'react';
import type { VideoMetadata } from '../types';
import { isVideoExpired } from '../types';

interface VideoHistoryGalleryProps {
  videoHistory: VideoMetadata[];
  onRemix: (metadata: VideoMetadata) => void;
  onDelete: (openaiVideoId: string) => void;
  openaiApiKey: string | null;
  azureApiKey: string;
}

export function VideoHistoryGallery({
  videoHistory,
  onRemix,
  onDelete,
  openaiApiKey,
  azureApiKey,
}: VideoHistoryGalleryProps) {
  const [redownloadingId, setRedownloadingId] = useState<string | null>(null);

  if (videoHistory.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No video history yet. Generate your first video above!</p>
        <p className="text-sm mt-2">Video metadata will be saved here for 24 hours.</p>
      </div>
    );
  }

  const handleRedownload = async (metadata: VideoMetadata) => {
    if (isVideoExpired(metadata)) return;

    const activeApiKey = metadata.provider === 'openai' ? openaiApiKey : azureApiKey;
    if (!activeApiKey) {
      alert('Missing API key for the provider that created this video.');
      return;
    }
    if (metadata.provider === 'azure' && !metadata.azure?.endpoint) {
      alert('Missing Azure endpoint for this video. Update your Azure settings and try again.');
      return;
    }

    setRedownloadingId(metadata.openaiVideoId);
    try {
      // Re-download video from OpenAI
      const openaiService = await import('../services/openaiService');
      const blob = await openaiService.openaiService.downloadVideo(
        metadata.openaiVideoId,
        activeApiKey,
        {
          provider: metadata.provider,
          azure: {
            apiKey: azureApiKey,
            endpoint: metadata.azure?.endpoint || '',
            apiType: metadata.azure?.apiType || 'v1',
            videoDeployment: metadata.azure?.videoDeployment || '',
            plannerDeployment: metadata.azure?.plannerDeployment || '',
            imageDeployment: metadata.azure?.imageDeployment || '',
            apiVersion: metadata.azure?.apiVersion || '',
          },
        }
      );

      // Create temporary download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sora-${metadata.localId}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[VideoHistoryGallery] Re-download failed:', error);
      alert('Failed to re-download video. It may have expired at OpenAI.');
    } finally {
      setRedownloadingId(null);
    }
  };

  const formatTimeRemaining = (expiresAt: number): string => {
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videoHistory.map((metadata) => {
        const expired = isVideoExpired(metadata);
        const timeRemaining = formatTimeRemaining(metadata.expiresAt);
        const providerLabel = metadata.provider === 'azure' ? 'Azure' : 'OpenAI';

        return (
          <div
            key={metadata.localId}
            className={`relative group bg-white/10 backdrop-blur rounded-xl overflow-hidden border transition-all ${
              expired
                ? 'border-red-500/30 opacity-60'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            {/* Metadata Display (No video preview - video not stored) */}
            <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-6 text-center">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-white/80 text-sm line-clamp-3 mb-2">
                {metadata.prompt}
              </p>

              {/* Expiration Status */}
              <div className={`text-xs font-semibold mt-2 ${
                expired ? 'text-red-400' : 'text-green-400'
              }`}>
                {expired ? '⏰ Expired' : `✓ ${timeRemaining}`}
              </div>
            </div>

            {/* Action Buttons Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              {!expired && (
                <>
                  <button
                    onClick={() => onRemix(metadata)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    🎨 Remix
                  </button>
                  <button
                    onClick={() => handleRedownload(metadata)}
                    disabled={redownloadingId === metadata.openaiVideoId}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm disabled:opacity-50"
                  >
                    {redownloadingId === metadata.openaiVideoId ? '...' : '⬇️ Download'}
                  </button>
                </>
              )}
              <button
                onClick={() => onDelete(metadata.openaiVideoId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                🗑️ Delete
              </button>
            </div>

            {/* Metadata Info */}
            <div className="p-4">
              {/* Parameters */}
              <div className="flex gap-2 text-xs text-white/60 mb-2">
                <span>{providerLabel}</span>
                <span>•</span>
                <span>{metadata.parameters.model}</span>
                <span>•</span>
                <span>{metadata.parameters.seconds}s</span>
                <span>•</span>
                <span>{metadata.parameters.size}</span>
              </div>

              {/* Relationship Indicators */}
              <div className="flex flex-wrap gap-2 mb-2">
                {metadata.remixedFrom && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-500/20 text-purple-200 text-xs">
                    🎨 Remix
                  </span>
                )}
                {metadata.remixCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-500/20 text-green-200 text-xs">
                    {metadata.remixCount} remix{metadata.remixCount > 1 ? 'es' : ''}
                  </span>
                )}
              </div>

              {/* Creation Time */}
              <p className="text-xs text-white/40">
                {new Date(metadata.createdAt).toLocaleString()}
              </p>

              {/* Video ID (for debugging) */}
              <p className="text-xs text-white/30 font-mono mt-1 truncate">
                {metadata.openaiVideoId}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
