import { create } from 'zustand';
import type { VideoStoreState, VideoSegment } from '../types';
import { storageService } from '../services/storageService';

export const useVideoStore = create<VideoStoreState>((set) => ({
  // State
  apiKey: storageService.getApiKey(),
  segments: [],
  finalVideoUrl: null,
  isProcessing: false,
  error: null,
  ffmpegReady: false,

  // Actions
  setApiKey: (key: string) => {
    storageService.saveApiKey(key);
    set({ apiKey: key });
  },

  clearApiKey: () => {
    storageService.clearApiKey();
    set({ apiKey: null });
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
}));
