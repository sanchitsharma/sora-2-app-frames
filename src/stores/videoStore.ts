import { create } from 'zustand';
import type { VideoStoreState, VideoSegment, VideoMetadata } from '../types';
import { storageService } from '../services/storageService';

export const useVideoStore = create<VideoStoreState>((set, get) => ({
  // State
  apiKey: storageService.getApiKey(),
  segments: [],
  finalVideoUrl: null,
  isProcessing: false,
  error: null,
  ffmpegReady: false,

  // Video metadata history (NOT video files)
  videoHistory: storageService.loadVideoHistory(),
  selectedVideoForRemix: null,

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
