import { useState } from 'react';
import { useVideoStore } from '../stores/videoStore';
import { storageService } from '../services/storageService';

export function ApiKeyInput() {
  const { apiKey, setApiKey } = useVideoStore();
  const [input, setInput] = useState(apiKey || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');

    if (!input.trim()) {
      setError('API key cannot be empty');
      return;
    }

    if (!storageService.validateApiKey(input)) {
      setError('Invalid API key format. Must start with "sk-"');
      return;
    }

    setApiKey(input);
    setError('');
  };

  const handleClear = () => {
    setInput('');
    setApiKey('');
    setError('');
  };

  return (
    <div className="mb-10">
      <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
        <span className="text-base">🔑</span>
        OpenAI API Key
      </label>
      <div className="flex gap-3">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="sk-proj-..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
          style={{ fontFamily: 'Inter, sans-serif' }}
        />
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Save
        </button>
        {apiKey && (
          <button
            onClick={handleClear}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Clear
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-3 font-medium flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span>⚠</span> {error}
        </p>
      )}
      {apiKey && !error && (
        <p className="text-sm text-green-700 mt-3 font-medium flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span>✓</span> API key saved securely
        </p>
      )}
      <p className="text-xs text-gray-500 mt-3 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
        🔒 Your API key is stored locally in your browser session and only sent to OpenAI via our secure proxy.
        It will be cleared when you close this tab.
      </p>
    </div>
  );
}
