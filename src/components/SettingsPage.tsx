import { useState } from 'react';
import type { ApiProvider, AzureApiType, AzureProviderSettings } from '../types';
import { storageService } from '../services/storageService';
import { useVideoStore } from '../stores/videoStore';

interface SettingsPageProps {
  onClose: () => void;
}

const normalizeEndpoint = (value: string) => value.trim().replace(/\/+$/, '');

export function SettingsPage({ onClose }: SettingsPageProps) {
  const {
    provider,
    openaiApiKey,
    azureSettings,
    settingsPersisted,
    setProvider,
    setOpenAIApiKey,
    clearOpenAIApiKey,
    setAzureSettings,
    setSettingsPersisted,
  } = useVideoStore();

  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>(provider);
  const [openaiKey, setOpenaiKey] = useState(openaiApiKey || '');
  const [azureKey, setAzureKey] = useState(azureSettings.apiKey);
  const [azureEndpoint, setAzureEndpoint] = useState(azureSettings.endpoint);
  const [azureApiType, setAzureApiType] = useState<AzureApiType>(azureSettings.apiType);
  const [videoDeployment, setVideoDeployment] = useState(azureSettings.videoDeployment);
  const [plannerDeployment, setPlannerDeployment] = useState(azureSettings.plannerDeployment);
  const [imageDeployment, setImageDeployment] = useState(azureSettings.imageDeployment);
  const [apiVersion, setApiVersion] = useState(azureSettings.apiVersion);
  const [persistSettings, setPersistSettings] = useState(settingsPersisted);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleTogglePersist = (enabled: boolean) => {
    setPersistSettings(enabled);
    if (!enabled) {
      storageService.setSettingsPersisted(false);
      setSettingsPersisted(false);
    }
  };

  const handleSave = () => {
    setError('');
    setSaved(false);

    if (selectedProvider === 'openai') {
      if (!storageService.validateApiKey(openaiKey, 'openai')) {
        setError('OpenAI API key must start with "sk-".');
        return;
      }
    } else {
      if (!storageService.validateApiKey(azureKey, 'azure')) {
        setError('Azure API key is required.');
        return;
      }
      if (!azureEndpoint.trim()) {
        setError('Azure endpoint is required.');
        return;
      }
      if (!videoDeployment.trim()) {
        setError('Azure video deployment name is required.');
        return;
      }
      if (!plannerDeployment.trim()) {
        setError('Azure planner deployment name is required.');
        return;
      }
      if (azureApiType === 'deployments' && !apiVersion.trim()) {
        setError('API version is required for deployments API.');
        return;
      }
    }

    const nextAzureSettings: AzureProviderSettings = {
      apiKey: azureKey.trim(),
      endpoint: normalizeEndpoint(azureEndpoint),
      apiType: azureApiType,
      videoDeployment: videoDeployment.trim(),
      plannerDeployment: plannerDeployment.trim(),
      imageDeployment: imageDeployment.trim(),
      apiVersion: apiVersion.trim(),
    };

    setProvider(selectedProvider);
    if (openaiKey.trim()) {
      setOpenAIApiKey(openaiKey.trim());
    } else {
      clearOpenAIApiKey();
    }
    setAzureSettings(nextAzureSettings);
    setSettingsPersisted(persistSettings);

    if (persistSettings) {
      storageService.saveLocalSettings({
        provider: selectedProvider,
        openaiApiKey: openaiKey.trim() || null,
        azureSettings: nextAzureSettings,
      });
    } else {
      storageService.clearLocalSettings();
    }
    setSaved(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">⚙️ Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure OpenAI or Azure OpenAI credentials and deployments.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all font-medium"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Done
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <p className="text-sm font-medium text-gray-700 mb-4">Active Provider</p>
        <div className="flex flex-wrap gap-3">
          {(['openai', 'azure'] as ApiProvider[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedProvider(value)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                selectedProvider === value
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {value === 'openai' ? 'OpenAI' : 'Azure OpenAI'}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Remember settings for 24 hours</p>
            <p className="text-xs text-gray-500">
              Stores settings in local storage and auto-deletes after one day.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleTogglePersist(!persistSettings)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              persistSettings ? 'bg-black' : 'bg-gray-300'
            }`}
            aria-pressed={persistSettings}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                persistSettings ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">OpenAI</h3>
          <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-proj-..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </section>

        <section className="border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Azure OpenAI</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint</label>
              <input
                type="text"
                value={azureEndpoint}
                onChange={(e) => setAzureEndpoint(e.target.value)}
                placeholder="https://your-resource.openai.azure.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Type</label>
              <select
                value={azureApiType}
                onChange={(e) => setAzureApiType(e.target.value as AzureApiType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <option value="v1">Azure OpenAI v1 API</option>
                <option value="deployments">Deployments API (api-version)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              <input
                type="password"
                value={azureKey}
                onChange={(e) => setAzureKey(e.target.value)}
                placeholder="Azure OpenAI key"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            {azureApiType === 'deployments' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Version</label>
                <input
                  type="text"
                  value={apiVersion}
                  onChange={(e) => setApiVersion(e.target.value)}
                  placeholder="2024-02-15-preview"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Video Deployment</label>
              <input
                type="text"
                value={videoDeployment}
                onChange={(e) => setVideoDeployment(e.target.value)}
                placeholder="sora-2-deployment"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Planner Deployment</label>
              <input
                type="text"
                value={plannerDeployment}
                onChange={(e) => setPlannerDeployment(e.target.value)}
                placeholder="gpt-4o-planner"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image Deployment (Optional)</label>
              <input
                type="text"
                value={imageDeployment}
                onChange={(e) => setImageDeployment(e.target.value)}
                placeholder="gpt-image-1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between">
        <div>
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
          {saved && !error && <p className="text-sm text-green-700 font-medium">Settings saved.</p>}
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
