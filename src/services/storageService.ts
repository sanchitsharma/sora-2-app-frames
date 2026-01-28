// Storage service for managing API key in sessionStorage
// CRITICAL: Uses sessionStorage (cleared on tab close), not localStorage

import type { ApiProvider, AzureProviderSettings, VideoMetadata } from '../types';

const STORAGE_KEYS = {
  SETTINGS_PERSIST: 'sora_settings_persist',
  LOCAL_SETTINGS: 'sora_settings_local',
  LOCAL_SETTINGS_TS: 'sora_settings_local_ts',
  PROVIDER: 'sora_provider',
  OPENAI_API_KEY: 'openai_api_key',
  AZURE_API_KEY: 'azure_api_key',
  AZURE_ENDPOINT: 'azure_endpoint',
  AZURE_API_TYPE: 'azure_api_type',
  AZURE_VIDEO_DEPLOYMENT: 'azure_video_deployment',
  AZURE_PLANNER_DEPLOYMENT: 'azure_planner_deployment',
  AZURE_IMAGE_DEPLOYMENT: 'azure_image_deployment',
  AZURE_API_VERSION: 'azure_api_version',
  VIDEO_HISTORY: 'sora-video-metadata-history', // Video metadata history
} as const;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type StoredSettings = {
  provider: ApiProvider;
  openaiApiKey: string | null;
  azureSettings: AzureProviderSettings;
};

export const storageService = {
  isSettingsPersisted(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SETTINGS_PERSIST) === 'true';
  },

  setSettingsPersisted(enabled: boolean): void {
    if (enabled) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS_PERSIST, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS_PERSIST);
      this.clearLocalSettings();
    }
  },

  saveLocalSettings(settings: StoredSettings): void {
    localStorage.setItem(STORAGE_KEYS.LOCAL_SETTINGS, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEYS.LOCAL_SETTINGS_TS, String(Date.now()));
    localStorage.setItem(STORAGE_KEYS.SETTINGS_PERSIST, 'true');
  },

  clearLocalSettings(): void {
    localStorage.removeItem(STORAGE_KEYS.LOCAL_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.LOCAL_SETTINGS_TS);
  },

  loadLocalSettings(): StoredSettings | null {
    if (!this.isSettingsPersisted()) return null;
    const ts = Number(localStorage.getItem(STORAGE_KEYS.LOCAL_SETTINGS_TS) || '0');
    if (!ts || Date.now() - ts > ONE_DAY_MS) {
      this.clearLocalSettings();
      localStorage.removeItem(STORAGE_KEYS.SETTINGS_PERSIST);
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_SETTINGS);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredSettings;
      return {
        ...parsed,
        azureSettings: {
          ...parsed.azureSettings,
          imageDeployment: parsed.azureSettings.imageDeployment || '',
        },
      };
    } catch {
      this.clearLocalSettings();
      return null;
    }
  },

  getBootstrapSettings(): StoredSettings & { settingsPersisted: boolean } {
    const persisted = this.loadLocalSettings();
    if (persisted) {
      return { ...persisted, settingsPersisted: true };
    }

    return {
      provider: this.getProvider(),
      openaiApiKey: this.getOpenAIApiKey(),
      azureSettings: this.getAzureSettings(),
      settingsPersisted: this.isSettingsPersisted(),
    };
  },

  /**
   * Save provider selection to sessionStorage
   */
  saveProvider(provider: ApiProvider): void {
    sessionStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
  },

  /**
   * Get provider from sessionStorage
   */
  getProvider(): ApiProvider {
    const stored = sessionStorage.getItem(STORAGE_KEYS.PROVIDER);
    return stored === 'azure' ? 'azure' : 'openai';
  },

  /**
   * Save OpenAI API key to sessionStorage
   */
  saveOpenAIApiKey(key: string): void {
    sessionStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, key);
  },

  /**
   * Get OpenAI API key from sessionStorage
   */
  getOpenAIApiKey(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY);
  },

  /**
   * Clear OpenAI API key from sessionStorage
   */
  clearOpenAIApiKey(): void {
    sessionStorage.removeItem(STORAGE_KEYS.OPENAI_API_KEY);
  },

  /**
   * Save Azure settings to sessionStorage
   */
  saveAzureSettings(settings: AzureProviderSettings): void {
    sessionStorage.setItem(STORAGE_KEYS.AZURE_API_KEY, settings.apiKey);
    sessionStorage.setItem(STORAGE_KEYS.AZURE_ENDPOINT, settings.endpoint);
    sessionStorage.setItem(STORAGE_KEYS.AZURE_API_TYPE, settings.apiType);
    sessionStorage.setItem(STORAGE_KEYS.AZURE_VIDEO_DEPLOYMENT, settings.videoDeployment);
    sessionStorage.setItem(STORAGE_KEYS.AZURE_PLANNER_DEPLOYMENT, settings.plannerDeployment);
    sessionStorage.setItem(STORAGE_KEYS.AZURE_IMAGE_DEPLOYMENT, settings.imageDeployment);
    sessionStorage.setItem(STORAGE_KEYS.AZURE_API_VERSION, settings.apiVersion);
  },

  /**
   * Get Azure settings from sessionStorage
   */
  getAzureSettings(): AzureProviderSettings {
    return {
      apiKey: sessionStorage.getItem(STORAGE_KEYS.AZURE_API_KEY) || '',
      endpoint: sessionStorage.getItem(STORAGE_KEYS.AZURE_ENDPOINT) || '',
      apiType: (sessionStorage.getItem(STORAGE_KEYS.AZURE_API_TYPE) as AzureProviderSettings['apiType']) || 'v1',
      videoDeployment: sessionStorage.getItem(STORAGE_KEYS.AZURE_VIDEO_DEPLOYMENT) || '',
      plannerDeployment: sessionStorage.getItem(STORAGE_KEYS.AZURE_PLANNER_DEPLOYMENT) || '',
      imageDeployment: sessionStorage.getItem(STORAGE_KEYS.AZURE_IMAGE_DEPLOYMENT) || '',
      apiVersion: sessionStorage.getItem(STORAGE_KEYS.AZURE_API_VERSION) || '',
    };
  },

  /**
   * Validate API key format
   * @param key - The API key to validate
   * @returns true if valid, false otherwise
   */
  validateApiKey(key: string, provider: ApiProvider): boolean {
    if (provider === 'openai') {
      return key.trim().startsWith('sk-');
    }
    return key.trim().length > 0;
  },

  // Video metadata storage (NOT video files, only metadata)
  saveVideoHistory(metadata: VideoMetadata[]): void {
    try {
      // Only store metadata, not video blobs
      const serializable = metadata.map(m => ({
        openaiVideoId: m.openaiVideoId,
        localId: m.localId,
        prompt: m.prompt,
        provider: m.provider,
        azure: m.azure,
        parameters: m.parameters,
        createdAt: m.createdAt,
        expiresAt: m.expiresAt,
        remixedFrom: m.remixedFrom,
        remixCount: m.remixCount,
        isExpired: m.isExpired,
      }));
      localStorage.setItem(STORAGE_KEYS.VIDEO_HISTORY, JSON.stringify(serializable));
      console.log(`[StorageService] Saved ${metadata.length} video metadata entries`);
    } catch (error) {
      console.error('[StorageService] Failed to save video history:', error);
    }
  },

  loadVideoHistory(): VideoMetadata[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIDEO_HISTORY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      // Update isExpired flag on load
      return parsed.map((m: VideoMetadata) => ({
        ...m,
        provider: m.provider || 'openai',
        isExpired: Date.now() > m.expiresAt,
      }));
    } catch (error) {
      console.error('[StorageService] Failed to load video history:', error);
      return [];
    }
  },

  clearVideoHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.VIDEO_HISTORY);
    console.log('[StorageService] Cleared video history');
  }
};
