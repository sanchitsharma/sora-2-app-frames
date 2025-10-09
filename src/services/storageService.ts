// Storage service for managing API key in sessionStorage
// CRITICAL: Uses sessionStorage (cleared on tab close), not localStorage

const API_KEY_STORAGE_KEY = 'openai_api_key';

export const storageService = {
  /**
   * Save API key to sessionStorage
   * @param key - The OpenAI API key
   */
  saveApiKey(key: string): void {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
  },

  /**
   * Get API key from sessionStorage
   * @returns The stored API key or null if not found
   */
  getApiKey(): string | null {
    return sessionStorage.getItem(API_KEY_STORAGE_KEY);
  },

  /**
   * Clear API key from sessionStorage
   */
  clearApiKey(): void {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  },

  /**
   * Validate API key format
   * @param key - The API key to validate
   * @returns true if valid, false otherwise
   */
  validateApiKey(key: string): boolean {
    return key.trim().startsWith('sk-');
  }
};
