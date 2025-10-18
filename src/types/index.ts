// Video Segment Types
export interface VideoSegment {
  id: string; // Local segment ID (e.g., "segment-0")
  openaiVideoId?: string; // OpenAI video_id (format: "video_abc123...")
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  videoBlob?: Blob; // Only in memory during current session
  videoUrl?: string; // Object URL (lost on refresh)
  error?: string;
  createdAt?: number; // Timestamp for expiration tracking
}

// Video metadata stored in localStorage (NO video files)
export interface VideoMetadata {
  openaiVideoId: string; // OpenAI video_id (required for remix)
  localId: string; // Local identifier for UI
  prompt: string;
  parameters: {
    seconds: number;
    size: string;
    model: string;
  };
  createdAt: number; // Timestamp (ms since epoch)
  expiresAt: number; // createdAt + 24 hours
  remixedFrom?: string; // Parent video's OpenAI ID
  remixCount: number; // Number of child remixes
  isExpired: boolean; // Computed: Date.now() > expiresAt
}

// Helper function to check if metadata is expired
export function isVideoExpired(metadata: VideoMetadata): boolean {
  return Date.now() > metadata.expiresAt;
}

// Helper to calculate expiration time
export function calculateExpiresAt(createdAt: number): number {
  return createdAt + (24 * 60 * 60 * 1000); // 24 hours in milliseconds
}

// OpenAI Video Job Types
export interface VideoJob {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  error?: { message: string };
  remixed_from_video_id?: string | null;
}

// Video Generation Configuration
export interface GenerationConfig {
  prompt: string;
  seconds: number; // UI uses number for easier calculation
  numSegments: number;
  size: string;
  model: string;
}

// OpenAI API Request Types
export interface CreateVideoRequest {
  apiKey: string;
  prompt: string;
  seconds: string; // OpenAI API expects string: '4', '8', or '12'
  size: string;
  model: string;
  remixedFromVideoId?: string; // Optional: ID of video to remix from
  inputReference?: Blob; // Optional: Image for frame continuity (last frame of previous video)
}

// Planned Segment from AI
export interface PlannedSegment {
  title: string;
  seconds: number;
  prompt: string;
}

// Planning Response
export interface PlanningResponse {
  segments: PlannedSegment[];
}

// Zustand Store State
export interface VideoStoreState {
  // State
  apiKey: string | null;
  segments: VideoSegment[];
  finalVideoUrl: string | null;
  isProcessing: boolean;
  error: string | null;
  ffmpegReady: boolean;

  // Video metadata history (NOT video files)
  videoHistory: VideoMetadata[];
  selectedVideoForRemix: VideoMetadata | null;

  // Actions
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  addSegment: (segment: VideoSegment) => void;
  updateSegment: (id: string, updates: Partial<VideoSegment>) => void;
  setFinalVideo: (url: string) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  setFFmpegReady: (ready: boolean) => void;
  reset: () => void;

  // Actions for remix feature
  saveVideoMetadata: (metadata: VideoMetadata) => void;
  loadVideoHistory: () => void;
  deleteVideoMetadata: (openaiVideoId: string) => void;
  selectVideoForRemix: (metadata: VideoMetadata | null) => void;
  incrementRemixCount: (openaiVideoId: string) => void;
}

// Form Data Types
export interface PromptFormData {
  prompt: string;
  seconds: number;
  numSegments: number;
  size: string;
}
