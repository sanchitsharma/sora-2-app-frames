import { useState } from 'react';
import type { VideoMetadata } from '../types';
import { isVideoExpired } from '../types';

interface RemixModalProps {
  originalMetadata: VideoMetadata | null;
  onClose: () => void;
  onSubmit: (newPrompt: string, keepSettings: boolean) => void;
  isOpen: boolean;
}

export function RemixModal({ originalMetadata, onClose, onSubmit, isOpen }: RemixModalProps) {
  const [newPrompt, setNewPrompt] = useState('');

  if (!isOpen || !originalMetadata) return null;

  const expired = isVideoExpired(originalMetadata);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPrompt.trim() && !expired) {
      onSubmit(newPrompt, true); // Always keep settings (remix inherits all settings)
      setNewPrompt('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur px-6 py-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">🎨 Remix Video</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Expiration Warning */}
          {expired && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm font-semibold">
                ⏰ This video has expired (older than 24 hours).
                Remix is no longer available.
              </p>
            </div>
          )}

          {/* Original Video Metadata */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-2">Original Video</h3>
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-white/80 mb-2">{originalMetadata.prompt}</p>
              <div className="flex gap-3 text-xs text-white/60">
                <span>{originalMetadata.parameters.model}</span>
                <span>•</span>
                <span>{originalMetadata.parameters.seconds}s</span>
                <span>•</span>
                <span>{originalMetadata.parameters.size}</span>
              </div>
            </div>
          </div>

          {/* Remix Form */}
          <form onSubmit={handleSubmit}>
            {/* New Prompt */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-white/80 mb-2">
                New Prompt
              </label>
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Describe the changes you want (e.g., 'same shot, warmer lighting' or 'same scene, add morning fog')"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px] resize-none"
                required
                disabled={expired}
              />
              <p className="text-xs text-white/50 mt-1">
                💡 Tip: Make one change at a time for best results
              </p>
            </div>

            {/* Info: Remix inherits all settings */}
            <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <p className="text-xs text-blue-300 mb-2">ℹ️ Remix Settings</p>
              <p className="text-xs text-white/70 mb-2">
                Remixes automatically inherit all settings from the original video:
              </p>
              <div className="flex gap-4 text-sm text-white/80">
                <span>{originalMetadata.parameters.model}</span>
                <span>•</span>
                <span>{originalMetadata.parameters.seconds}s</span>
                <span>•</span>
                <span>{originalMetadata.parameters.size}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-colors border border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPrompt.trim() || expired}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {expired ? 'Expired' : 'Generate Remix'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
