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
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        OpenAI API Key
      </label>
      <div className="flex gap-2">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="sk-proj-..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          Save
        </button>
        {apiKey && (
          <button
            onClick={handleClear}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Clear
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
      {apiKey && !error && (
        <p className="text-sm text-green-600 mt-2">
          ✓ API key saved
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Your API key is stored locally in your browser session and only sent to OpenAI via our secure proxy.
        It will be cleared when you close this tab.
      </p>
    </div>
  );
}
