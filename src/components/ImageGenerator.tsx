import { useState } from 'react';

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  file: File;
}

interface ImageGeneratorProps {
  images: GeneratedImage[];
  isGenerating: boolean;
  error: string | null;
  onGenerate: (prompt: string, size: string) => void;
  onSelectFirstFrame: (image: GeneratedImage) => void;
  onSelectLastFrame: (image: GeneratedImage) => void;
  selectedFirstFrameId: string | null;
  selectedLastFrameId: string | null;
  disabled?: boolean;
}

export function ImageGenerator({
  images,
  isGenerating,
  error,
  onGenerate,
  onSelectFirstFrame,
  onSelectLastFrame,
  selectedFirstFrameId,
  selectedLastFrameId,
  disabled = false,
}: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) {
      alert('Please enter an image prompt');
      return;
    }
    onGenerate(prompt.trim(), size);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="text-base">🖼️</span>
            Image Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            rows={4}
            disabled={disabled || isGenerating}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed bg-white resize-none"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              <span>📐</span>
              Size
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              disabled={disabled || isGenerating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all bg-white"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <option value="1024x1024">Square (1024x1024)</option>
              <option value="1024x1536">Portrait (1024x1536)</option>
              <option value="1536x1024">Landscape (1536x1024)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={disabled || isGenerating || !prompt.trim()}
              className="w-full px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span> Generating...
                </span>
              ) : (
                '✨ Generate Images'
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Generated Images</h3>
            <p className="text-xs text-gray-500">Click to assign start/end frames</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map((image) => (
              <div key={image.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="relative">
                  <img src={image.url} alt={image.prompt} className="w-full h-56 object-cover" />
                  {(selectedFirstFrameId === image.id || selectedLastFrameId === image.id) && (
                    <div className="absolute top-3 left-3 flex gap-2">
                      {selectedFirstFrameId === image.id && (
                        <span className="px-2 py-1 bg-black text-white text-xs rounded-full">First frame</span>
                      )}
                      {selectedLastFrameId === image.id && (
                        <span className="px-2 py-1 bg-gray-800 text-white text-xs rounded-full">Last frame</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-600 line-clamp-2">{image.prompt}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectFirstFrame(image)}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Use as First Frame
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectLastFrame(image)}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Use as Last Frame
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Frames will be resized to match your video resolution when applied.
          </p>
        </div>
      )}
    </div>
  );
}
