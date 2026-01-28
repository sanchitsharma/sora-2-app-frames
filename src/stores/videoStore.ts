import { create } from 'zustand';
import type { VideoStoreState, VideoSegment, VideoMetadata } from '../types';
import { storageService } from '../services/storageService';

const bootstrap = storageService.getBootstrapSettings();

const readEnv = (key: string) => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value : '';
};

const envBootstrap = {
  provider: (readEnv('VITE_PROVIDER') as 'openai' | 'azure') || bootstrap.provider,
  openaiApiKey: readEnv('VITE_OPENAI_API_KEY') || bootstrap.openaiApiKey,
  azureSettings: {
    ...bootstrap.azureSettings,
    apiKey: readEnv('VITE_AZURE_API_KEY') || bootstrap.azureSettings.apiKey,
    endpoint: readEnv('VITE_AZURE_ENDPOINT') || bootstrap.azureSettings.endpoint,
    apiType: (readEnv('VITE_AZURE_API_TYPE') as 'v1' | 'deployments') || bootstrap.azureSettings.apiType,
    videoDeployment: readEnv('VITE_AZURE_VIDEO_DEPLOYMENT') || bootstrap.azureSettings.videoDeployment,
    plannerDeployment: readEnv('VITE_AZURE_PLANNER_DEPLOYMENT') || bootstrap.azureSettings.plannerDeployment,
    imageDeployment: readEnv('VITE_AZURE_IMAGE_DEPLOYMENT') || bootstrap.azureSettings.imageDeployment,
    apiVersion: readEnv('VITE_AZURE_API_VERSION') || bootstrap.azureSettings.apiVersion,
  },
};

export const useVideoStore = create<VideoStoreState>((set, get) => ({
  // State
  provider: envBootstrap.provider,
  openaiApiKey: envBootstrap.openaiApiKey,
  azureSettings: envBootstrap.azureSettings,
  settingsPersisted: bootstrap.settingsPersisted,
  segments: [],
  finalVideoUrl: null,
  isProcessing: false,
  error: null,
  ffmpegReady: false,

  // Video metadata history (NOT video files)
  videoHistory: storageService.loadVideoHistory(),
  selectedVideoForRemix: null,

  // Actions
  setProvider: (provider) => {
    storageService.saveProvider(provider);
    set({ provider });
  },

  setOpenAIApiKey: (key: string) => {
    storageService.saveOpenAIApiKey(key);
    set({ openaiApiKey: key });
  },

  clearOpenAIApiKey: () => {
    storageService.clearOpenAIApiKey();
    set({ openaiApiKey: null });
  },

  setAzureSettings: (settings) => {
    storageService.saveAzureSettings(settings);
    set({ azureSettings: settings });
  },

  setSettingsPersisted: (enabled) => {
    storageService.setSettingsPersisted(enabled);
    set({ settingsPersisted: enabled });
  },

  addSegment: (segment: VideoSegment) =>
    set((state) => ({ segments: [...state.segments, segment] })),

  updateSegment: (id: string, updates: Partial<VideoSegment>) =>
    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.id === id ? { ...seg, ...updates } : seg
      ),
    })),

  setFinalVideo: (url: string) => set({ finalVideoUrl: url }),

  setProcessing: (processing: boolean) => set({ isProcessing: processing }),

  setError: (error: string | null) => set({ error }),

  setFFmpegReady: (ready: boolean) => set({ ffmpegReady: ready }),

  reset: () =>
    set({
      segments: [],
      finalVideoUrl: null,
      isProcessing: false,
      error: null,
    }),

  // Actions for remix feature
  saveVideoMetadata: (metadata: VideoMetadata) => {
    const history = [...get().videoHistory, metadata];
    set({ videoHistory: history });
    storageService.saveVideoHistory(history);
  },

  loadVideoHistory: () => {
    const history = storageService.loadVideoHistory();
    set({ videoHistory: history });
  },

  deleteVideoMetadata: (openaiVideoId: string) => {
    const history = get().videoHistory.filter(v => v.openaiVideoId !== openaiVideoId);
    set({ videoHistory: history });
    storageService.saveVideoHistory(history);
  },

  selectVideoForRemix: (metadata: VideoMetadata | null) => {
    set({ selectedVideoForRemix: metadata });
  },

  incrementRemixCount: (openaiVideoId: string) => {
    const history = get().videoHistory.map(v =>
      v.openaiVideoId === openaiVideoId ? { ...v, remixCount: v.remixCount + 1 } : v
    );
    set({ videoHistory: history });
    storageService.saveVideoHistory(history);
  },
}));
