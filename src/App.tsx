import { useState, useEffect } from 'react';
import { ApiKeyInput } from './components/ApiKeyInput';
import { PromptForm } from './components/PromptForm';
import { PromptPlanner } from './components/PromptPlanner';
import { OverallProgress } from './components/OverallProgress';
import { SegmentProgress } from './components/SegmentProgress';
import { VideoPlayer } from './components/VideoPlayer';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useVideoStore } from './stores/videoStore';
import { openaiService } from './services/openaiService';
import { videoService } from './services/videoService';
import { planningService } from './services/planningService';
import type { PromptFormData, VideoSegment, PlannedSegment } from './types';

export default function App() {
  const {
    apiKey,
    isProcessing,
    setProcessing,
    error,
    setError,
    finalVideoUrl,
    setFinalVideo,
    ffmpegReady,
    setFFmpegReady,
    reset,
  } = useVideoStore();

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [currentSegment, setCurrentSegment] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [plannedSegments, setPlannedSegments] = useState<PlannedSegment[] | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planConfig, setPlanConfig] = useState<PromptFormData | null>(null);

  // Initialize FFmpeg on mount
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        setStatus('Loading FFmpeg.wasm...');
        await videoService.initialize();
        setFFmpegReady(true);
        setStatus('Ready to generate videos');
      } catch (error) {
        console.error('Failed to initialize FFmpeg:', error);
        setError('Failed to load FFmpeg.wasm. Please refresh the page.');
      }
    };

    initFFmpeg();

    // Detect mobile browsers
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      setShowMobileWarning(true);
    }
  }, [setFFmpegReady, setError]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (finalVideoUrl) {
        URL.revokeObjectURL(finalVideoUrl);
      }
    };
  }, [finalVideoUrl]);

  const estimateMemoryUsage = (formData: PromptFormData): number => {
    // Estimate ~8MB per second of video
    const bytesPerSecond = 8 * 1024 * 1024;
    return formData.seconds * formData.numSegments * bytesPerSecond;
  };

  const handlePlanWithAI = async (formData: PromptFormData) => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key first');
      return;
    }

    try {
      setIsPlanning(true);
      setError(null);

      const segments = await planningService.planPrompts(
        apiKey,
        formData.prompt,
        formData.seconds,
        formData.numSegments
      );

      setPlannedSegments(segments);
      setPlanConfig(formData);
    } catch (err: any) {
      console.error('Planning error:', err);
      setError(err.message || 'Failed to plan prompts. Please try again.');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleEditPlannedSegment = (index: number, newPrompt: string) => {
    if (!plannedSegments) return;
    const updated = [...plannedSegments];
    updated[index] = { ...updated[index], prompt: newPrompt };
    setPlannedSegments(updated);
  };

  const handleCancelPlan = () => {
    setPlannedSegments(null);
    setPlanConfig(null);
  };

  const handleApprovePlan = async () => {
    if (!plannedSegments || !planConfig || !apiKey) return;

    try {
      setProcessing(true);
      setError(null);
      setProgress(0);
      setCurrentSegment(0);
      setTotalSegments(plannedSegments.length);
      setSegments([]);
      setPlannedSegments(null); // Hide planner

      const videoBlobs: Blob[] = [];
      const segmentList: VideoSegment[] = [];

      // Generate each segment using planned prompts
      for (let i = 0; i < plannedSegments.length; i++) {
        setCurrentSegment(i + 1);
        setStatus(`Generating segment ${i + 1}/${plannedSegments.length}: ${plannedSegments[i].title}...`);

        const segment: VideoSegment = {
          id: `segment-${i}`,
          prompt: plannedSegments[i].prompt,
          status: 'generating',
          progress: 0,
        };
        segmentList.push(segment);
        setSegments([...segmentList]);

        try {
          const job = await openaiService.createVideo({
            apiKey,
            prompt: plannedSegments[i].prompt,
            seconds: String(plannedSegments[i].seconds),
            size: planConfig.size,
            model: 'sora-2',
          });

          await openaiService.pollUntilComplete(job.id, apiKey, (segmentProgress) => {
            segment.progress = segmentProgress;
            setSegments([...segmentList]);

            const baseProgress = (i / plannedSegments.length) * 80;
            const segmentContribution = (segmentProgress / 100 / plannedSegments.length) * 80;
            setProgress(Math.round(baseProgress + segmentContribution));
          });

          setStatus(`Downloading segment ${i + 1}/${plannedSegments.length}...`);
          const blob = await openaiService.downloadVideo(job.id, apiKey);
          videoBlobs.push(blob);

          segment.status = 'completed';
          segment.progress = 100;
          segment.videoBlob = blob;
          setSegments([...segmentList]);
        } catch (segmentError: any) {
          segment.status = 'failed';
          segment.error = segmentError.message || 'Failed to generate segment';
          setSegments([...segmentList]);
          throw segmentError;
        }
      }

      // Concatenate videos
      let finalBlob: Blob;
      if (plannedSegments.length > 1) {
        setStatus('Concatenating videos...');
        setProgress(80);

        finalBlob = await videoService.concatenateVideos(videoBlobs, (concatProgress) => {
          setProgress(80 + Math.round(concatProgress * 0.2));
        });
      } else {
        finalBlob = videoBlobs[0];
      }

      const url = URL.createObjectURL(finalBlob);
      setFinalVideo(url);

      setProgress(100);
      setStatus('Complete!');
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate video. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerate = async (formData: PromptFormData) => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key first');
      return;
    }

    if (!ffmpegReady) {
      setError('FFmpeg is still loading. Please wait a moment.');
      return;
    }

    // Memory warning
    const estimatedSize = estimateMemoryUsage(formData);
    const maxSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB
    if (estimatedSize > maxSize) {
      const sizeGB = (estimatedSize / (1024 * 1024 * 1024)).toFixed(2);
      if (
        !confirm(
          `Warning: This will generate approximately ${sizeGB}GB of video data, which may cause your browser to freeze or crash on low-memory devices. Continue?`
        )
      ) {
        return;
      }
    }

    try {
      setProcessing(true);
      setError(null);
      setProgress(0);
      setCurrentSegment(0);
      setTotalSegments(formData.numSegments);
      setSegments([]);

      const videoBlobs: Blob[] = [];
      const segmentList: VideoSegment[] = [];

      // Generate each segment
      for (let i = 0; i < formData.numSegments; i++) {
        setCurrentSegment(i + 1);
        setStatus(`Generating segment ${i + 1}/${formData.numSegments}...`);

        // Create segment object
        const segment: VideoSegment = {
          id: `segment-${i}`,
          prompt: formData.prompt,
          status: 'generating',
          progress: 0,
        };
        segmentList.push(segment);
        setSegments([...segmentList]);

        try {
          // Create video job
          const job = await openaiService.createVideo({
            apiKey,
            prompt: formData.prompt,
            seconds: String(formData.seconds), // Convert to string for OpenAI API
            size: formData.size,
            model: 'sora-2',
          });

          // Poll for completion
          await openaiService.pollUntilComplete(job.id, apiKey, (segmentProgress) => {
            // Update segment progress
            segment.progress = segmentProgress;
            setSegments([...segmentList]);

            // Update overall progress (each segment is worth equal portion)
            const baseProgress = (i / formData.numSegments) * 80;
            const segmentContribution = (segmentProgress / 100 / formData.numSegments) * 80;
            setProgress(Math.round(baseProgress + segmentContribution));
          });

          // Download video
          setStatus(`Downloading segment ${i + 1}/${formData.numSegments}...`);
          const blob = await openaiService.downloadVideo(job.id, apiKey);
          videoBlobs.push(blob);

          // Mark segment as completed
          segment.status = 'completed';
          segment.progress = 100;
          segment.videoBlob = blob;
          setSegments([...segmentList]);
        } catch (segmentError: any) {
          segment.status = 'failed';
          segment.error = segmentError.message || 'Failed to generate segment';
          setSegments([...segmentList]);
          throw segmentError;
        }
      }

      // Concatenate videos
      let finalBlob: Blob;
      if (formData.numSegments > 1) {
        setStatus('Concatenating videos...');
        setProgress(80);

        finalBlob = await videoService.concatenateVideos(videoBlobs, (concatProgress) => {
          setProgress(80 + Math.round(concatProgress * 0.2));
        });
      } else {
        finalBlob = videoBlobs[0];
      }

      // Create object URL
      const url = URL.createObjectURL(finalBlob);
      setFinalVideo(url);

      setProgress(100);
      setStatus('Complete!');
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate video. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateNew = () => {
    // Revoke old object URL
    if (finalVideoUrl) {
      URL.revokeObjectURL(finalVideoUrl);
    }
    reset();
    setProgress(0);
    setStatus('');
    setCurrentSegment(0);
    setTotalSegments(0);
    setSegments([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Sora Video Generation
          </h1>
          <p className="text-gray-600">
            Generate AI videos with OpenAI Sora 2 - Powered by FFmpeg.wasm
          </p>
        </header>

        {showMobileWarning && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-6">
            <div className="flex items-start">
              <span className="text-yellow-600 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Mobile Browser Detected
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This application works best on desktop browsers. Mobile devices may have
                  memory limitations that could cause issues with large videos.
                </p>
              </div>
              <button
                onClick={() => setShowMobileWarning(false)}
                className="ml-auto text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl p-8">
          <ApiKeyInput />

          {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

          {!ffmpegReady && !error && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading FFmpeg.wasm...</p>
            </div>
          )}

          {ffmpegReady && !finalVideoUrl && !plannedSegments && (
            <PromptForm
              onSubmit={handleGenerate}
              onPlanWithAI={handlePlanWithAI}
              disabled={isProcessing || isPlanning}
            />
          )}

          {plannedSegments && (
            <PromptPlanner
              plannedSegments={plannedSegments}
              onEdit={handleEditPlannedSegment}
              onApprove={handleApprovePlan}
              onCancel={handleCancelPlan}
              isGenerating={isProcessing}
            />
          )}

          {isProcessing && (
            <>
              <OverallProgress
                progress={progress}
                status={status}
                currentSegment={currentSegment}
                totalSegments={totalSegments}
              />

              {segments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                  {segments.map((segment, index) => (
                    <SegmentProgress key={segment.id} segment={segment} index={index} />
                  ))}
                </div>
              )}
            </>
          )}

          {finalVideoUrl && <VideoPlayer url={finalVideoUrl} onGenerateNew={handleGenerateNew} />}
        </div>

        <footer className="text-center mt-8 text-sm text-gray-500">
          <p>
            Made with React, TypeScript, Vercel Edge Functions, and FFmpeg.wasm
          </p>
          <p className="mt-1">
            Your API key and videos never leave your device
          </p>
        </footer>
      </div>
    </div>
  );
}
