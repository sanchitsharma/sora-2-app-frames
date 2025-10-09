import { useState } from 'react';
import type { PromptFormData } from '../types';

interface PromptFormProps {
  onSubmit: (data: PromptFormData) => void;
  onPlanWithAI?: (data: PromptFormData) => void;
  disabled?: boolean;
}

export function PromptForm({ onSubmit, onPlanWithAI, disabled = false }: PromptFormProps) {
  const [prompt, setPrompt] = useState('');
  const [seconds, setSeconds] = useState<number>(4);
  const [numSegments, setNumSegments] = useState<number>(1);
  const [size, setSize] = useState('1280x720');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      alert('Please enter a video prompt');
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      seconds,
      numSegments,
      size,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Video Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the video you want to generate..."
          rows={4}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Segment Duration
          </label>
          <select
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value={4}>4 seconds</option>
            <option value={8}>8 seconds</option>
            <option value={12}>12 seconds</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Segments
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={numSegments}
            onChange={(e) => setNumSegments(Number(e.target.value))}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Total: {seconds * numSegments}s
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video Size
          </label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="1280x720">720p (1280x720)</option>
            <option value="1920x1080">1080p (1920x1080)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        {onPlanWithAI && (
          <button
            type="button"
            onClick={() => onPlanWithAI({ prompt: prompt.trim(), seconds, numSegments, size })}
            disabled={disabled || !prompt.trim()}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disabled ? 'Planning...' : '🎨 Plan with AI'}
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || !prompt.trim()}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Generating...' : 'Generate Video'}
        </button>
      </div>
    </form>
  );
}
