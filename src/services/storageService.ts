// Storage service for managing API key in sessionStorage
// CRITICAL: Uses sessionStorage (cleared on tab close), not localStorage

import type { VideoMetadata } from '../types';

const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
  VIDEO_HISTORY: 'sora-video-metadata-history', // Video metadata history
} as const;

export const storageService = {
  /**
   * Save API key to sessionStorage
   * @param key - The OpenAI API key
   */
  saveApiKey(key: string): void {
    sessionStorage.setItem(STORAGE_KEYS.API_KEY, key);
  },

  /**
   * Get API key from sessionStorage
   * @returns The stored API key or null if not found
   */
  getApiKey(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.API_KEY);
  },

  /**
   * Clear API key from sessionStorage
   */
  clearApiKey(): void {
    sessionStorage.removeItem(STORAGE_KEYS.API_KEY);
  },

  /**
   * Validate API key format
   * @param key - The API key to validate
   * @returns true if valid, false otherwise
   */
  validateApiKey(key: string): boolean {
    return key.trim().startsWith('sk-');
  },

  // Video metadata storage (NOT video files, only metadata)
  saveVideoHistory(metadata: VideoMetadata[]): void {
    try {
      // Only store metadata, not video blobs
      const serializable = metadata.map(m => ({
        openaiVideoId: m.openaiVideoId,
        localId: m.localId,
        prompt: m.prompt,
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
