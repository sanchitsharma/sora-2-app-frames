import { useState, useEffect } from 'react';
import { SettingsPage } from './components/SettingsPage';
import { PromptForm } from './components/PromptForm';
import { PromptPlanner } from './components/PromptPlanner';
import { OverallProgress } from './components/OverallProgress';
import { SegmentProgress } from './components/SegmentProgress';
import { VideoPlayer } from './components/VideoPlayer';
import { ErrorDisplay } from './components/ErrorDisplay';
import { VideoHistoryGallery } from './components/VideoHistoryGallery';
import { RemixModal } from './components/RemixModal';
import { ImageGenerator } from './components/ImageGenerator';
import { useVideoStore } from './stores/videoStore';
import { openaiService } from './services/openaiService';
import { videoService } from './services/videoService';
import { planningService } from './services/planningService';
import { storageService } from './services/storageService';
import { imageService } from './services/imageService';
import { extractLastFrame } from './utils/videoFrameExtractor';
import { resizeImageBlob } from './utils/imageResizer';
import type {
  ApiProvider,
  AzureProviderMetadata,
  ProviderConfig,
  PromptFormData,
  VideoSegment,
  PlannedSegment,
  VideoMetadata,
} from './types';
import type { GeneratedImage } from './components/ImageGenerator';
import { calculateExpiresAt, isVideoExpired } from './types';

export default function App() {
  const {
    provider,
    openaiApiKey,
    azureSettings,
    isProcessing,
    setProcessing,
    error,
    setError,
    finalVideoUrl,
    setFinalVideo,
    ffmpegReady,
    setFFmpegReady,
    reset,
    saveVideoMetadata,
    videoHistory,
    selectVideoForRemix,
    selectedVideoForRemix,
    incrementRemixCount,
    deleteVideoMetadata,
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
  const [showRemixModal, setShowRemixModal] = useState(false);
  const [showVideoHistory, setShowVideoHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video');
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedFirstFrame, setSelectedFirstFrame] = useState<GeneratedImage | null>(null);
  const [selectedLastFrame, setSelectedLastFrame] = useState<GeneratedImage | null>(null);

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

  const getApiKeyForProvider = (targetProvider: ApiProvider) =>
    targetProvider === 'openai' ? openaiApiKey : azureSettings.apiKey;

  const getEffectiveAzureSettings = (override?: AzureProviderMetadata) => ({
    apiKey: azureSettings.apiKey,
    endpoint: override?.endpoint || azureSettings.endpoint,
    apiType: override?.apiType || azureSettings.apiType,
    videoDeployment: override?.videoDeployment || azureSettings.videoDeployment,
    plannerDeployment: override?.plannerDeployment || azureSettings.plannerDeployment,
    imageDeployment: override?.imageDeployment || azureSettings.imageDeployment,
    apiVersion: override?.apiVersion || azureSettings.apiVersion,
  });

  const getProviderConfig = (
    targetProvider: ApiProvider,
    overrideAzure?: AzureProviderMetadata
  ): ProviderConfig => ({
    provider: targetProvider,
    azure: overrideAzure ? getEffectiveAzureSettings(overrideAzure) : azureSettings,
  });

  const getAzureMetadata = (): AzureProviderMetadata => ({
    endpoint: azureSettings.endpoint,
    apiType: azureSettings.apiType,
    videoDeployment: azureSettings.videoDeployment,
    plannerDeployment: azureSettings.plannerDeployment,
    imageDeployment: azureSettings.imageDeployment,
    apiVersion: azureSettings.apiVersion,
  });

  const validateProviderSettings = (
    targetProvider: ApiProvider,
    overrideAzure?: AzureProviderMetadata
  ): string | null => {
    if (targetProvider === 'openai') {
      if (!openaiApiKey) return 'Please add your OpenAI API key in Settings.';
      if (!storageService.validateApiKey(openaiApiKey, 'openai')) {
        return 'OpenAI API key must start with "sk-".';
      }
      return null;
    }

    const effectiveAzure = getEffectiveAzureSettings(overrideAzure);
    if (!effectiveAzure.apiKey) return 'Please add your Azure OpenAI API key in Settings.';
    if (!effectiveAzure.endpoint) return 'Please add your Azure endpoint in Settings.';
    if (!effectiveAzure.videoDeployment) return 'Please add your Azure video deployment in Settings.';
    if (!effectiveAzure.plannerDeployment) return 'Please add your Azure planner deployment in Settings.';
    if (effectiveAzure.apiType === 'deployments' && !effectiveAzure.apiVersion) {
      return 'Please add your Azure API version in Settings.';
    }
    return null;
  };

  const estimateMemoryUsage = (formData: PromptFormData): number => {
    // Estimate ~8MB per second of video
    const bytesPerSecond = 8 * 1024 * 1024;
    return formData.seconds * formData.numSegments * bytesPerSecond;
  };

  const handlePlanWithAI = async (formData: PromptFormData) => {
    const providerError = validateProviderSettings(provider);
    if (providerError) {
      setError(providerError);
      return;
    }

    try {
      setIsPlanning(true);
      setError(null);

      const activeApiKey = getApiKeyForProvider(provider);
      if (!activeApiKey) {
        setError('Missing API key for selected provider.');
        return;
      }

      const segments = await planningService.planPrompts(
        activeApiKey,
        getProviderConfig(provider),
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

  const promptForFrames = (prompt: string) =>
    `${prompt}. Keep composition clear, centered subject, high contrast, no text.`;

  const parseSize = (size: string) => {
    const [width, height] = size.split('x').map((value) => Number(value));
    return { width, height };
  };

  const handleGenerateImages = async (prompt: string, size: string) => {
    const providerError = validateProviderSettings(provider);
    if (providerError) {
      setImageGenerationError(providerError);
      return;
    }

    setIsGeneratingImages(true);
    setImageGenerationError(null);

    try {
      const activeApiKey = getApiKeyForProvider(provider);
      if (!activeApiKey) {
        throw new Error('Missing API key for selected provider.');
      }

      const modelName = provider === 'azure'
        ? azureSettings.imageDeployment || azureSettings.plannerDeployment || azureSettings.videoDeployment
        : 'gpt-image-1';

      const [firstResponse, lastResponse] = await Promise.all([
        imageService.generateImages({
          provider,
          providerConfig: getProviderConfig(provider),
          apiKey: activeApiKey,
          prompt: promptForFrames(`${prompt} (first frame)`),
          size,
          model: modelName,
          count: 1,
        }),
        imageService.generateImages({
          provider,
          providerConfig: getProviderConfig(provider),
          apiKey: activeApiKey,
          prompt: promptForFrames(`${prompt} (last frame)`),
          size,
          model: modelName,
          count: 1,
        }),
      ]);

      const response = {
        data: [...(firstResponse.data || []), ...(lastResponse.data || [])],
      };

      const batchId = Date.now();
      const images: GeneratedImage[] = (response.data || []).map((item: any, index: number) => {
        const b64 = item.b64_json;
        const url = b64 ? `data:image/png;base64,${b64}` : item.url;
        const byteString = b64 ? atob(b64) : '';
        const byteNumbers = b64 ? Array.from(byteString, (char) => char.charCodeAt(0)) : [];
        const byteArray = b64 ? new Uint8Array(byteNumbers) : new Uint8Array();
        const blob = b64 ? new Blob([byteArray], { type: 'image/png' }) : null;
        const file = blob
          ? new File([blob], `generated-${batchId}-${index}.png`, { type: 'image/png' })
          : new File([], `generated-${batchId}-${index}.png`);

        return {
          id: `image-${batchId}-${index}`,
          prompt,
          url,
          file,
        };
      });

      setGeneratedImages(images);
      if (images.length) {
        setSelectedFirstFrame(images[0]);
        if (images.length > 1) {
          setSelectedLastFrame(images[1]);
        }
      }
      setActiveTab('video');
    } catch (err: any) {
      setImageGenerationError(err.message || 'Failed to generate images.');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleSelectFirstFrame = (image: GeneratedImage) => {
    setSelectedFirstFrame(image);
  };

  const handleSelectLastFrame = (image: GeneratedImage) => {
    setSelectedLastFrame(image);
  };

  const handleApprovePlan = async () => {
    if (!plannedSegments || !planConfig) return;

    const providerError = validateProviderSettings(provider);
    if (providerError) {
      setError(providerError);
      return;
    }

    if (plannedSegments.length > 1 && !ffmpegReady) {
      setError('FFmpeg is still loading. Please wait a moment.');
      return;
    }

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
      let lastFrameBlob: Blob | undefined = undefined;

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
          const activeApiKey = getApiKeyForProvider(provider);
          if (!activeApiKey) {
            throw new Error('Missing API key for selected provider.');
          }
          const modelName = provider === 'azure' ? azureSettings.videoDeployment : 'sora-2';

          const segmentFirstFrame = i === 0
            ? selectedFirstFrame?.file || planConfig.firstFrame || undefined
            : undefined;
          const segmentLastFrame =
            i === plannedSegments.length - 1
              ? selectedLastFrame?.file || planConfig.lastFrame || undefined
              : undefined;

          const { width, height } = parseSize(planConfig.size);
          const resizedFirstFrame = segmentFirstFrame
            ? await resizeImageBlob(segmentFirstFrame, width, height)
            : undefined;
          const resizedLastFrame = segmentLastFrame
            ? await resizeImageBlob(segmentLastFrame, width, height)
            : undefined;

          const referenceFrame =
            provider === 'openai' ? lastFrameBlob || resizedFirstFrame : lastFrameBlob;

          // Create video job with frame continuity (if not first segment)
          const job = await openaiService.createVideo({
            provider,
            providerConfig: getProviderConfig(provider),
            apiKey: activeApiKey,
            prompt: plannedSegments[i].prompt,
            seconds: String(plannedSegments[i].seconds),
            size: planConfig.size,
            model: modelName,
            inputReference: referenceFrame, // Use last frame from previous video
            firstFrame: provider === 'azure' ? resizedFirstFrame || undefined : undefined,
            lastFrame: provider === 'azure' ? resizedLastFrame || undefined : undefined,
          });

          await openaiService.pollUntilComplete(job.id, activeApiKey, getProviderConfig(provider), (segmentProgress) => {
            segment.progress = segmentProgress;
            setSegments([...segmentList]);

            const baseProgress = (i / plannedSegments.length) * 80;
            const segmentContribution = (segmentProgress / 100 / plannedSegments.length) * 80;
            setProgress(Math.round(baseProgress + segmentContribution));
          });

          setStatus(`Downloading segment ${i + 1}/${plannedSegments.length}...`);
          const blob = await openaiService.downloadVideo(job.id, activeApiKey, getProviderConfig(provider));
          videoBlobs.push(blob);

          segment.status = 'completed';
          segment.progress = 100;
          segment.videoBlob = blob;
          setSegments([...segmentList]);

          // Store OpenAI video ID and creation time in segment
          segment.openaiVideoId = job.id;
          segment.createdAt = Date.now();
          setSegments([...segmentList]);

          // Save metadata for this segment to history
          // segment.prompt already contains plannedSegments[i].prompt (set on line 139)
          const segmentMetadata: VideoMetadata = {
            openaiVideoId: job.id,
            localId: `planned-segment-${i}-${Date.now()}`,
            prompt: segment.prompt,  // AI-planned segment-specific prompt
            provider,
            ...(provider === 'azure' ? { azure: getAzureMetadata() } : {}),
            parameters: {
              seconds: plannedSegments[i].seconds,
              size: planConfig.size,
              model: modelName,
            },
            createdAt: Date.now(),
            expiresAt: calculateExpiresAt(Date.now()),
            remixCount: 0,
            isExpired: false,
          };
          saveVideoMetadata(segmentMetadata);

          // Extract last frame for next segment (if not the last segment)
          if (i < plannedSegments.length - 1) {
            setStatus(`Extracting frame from segment ${i + 1} for continuity...`);
            lastFrameBlob = await extractLastFrame(blob);
          }
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
    const providerError = validateProviderSettings(provider);
    if (providerError) {
      setError(providerError);
      return;
    }

    if (formData.numSegments > 1 && !ffmpegReady) {
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
      let lastFrameBlob: Blob | undefined = undefined;
      const selectedFirstFile = selectedFirstFrame?.file || formData.firstFrame || undefined;
      const selectedLastFile = selectedLastFrame?.file || formData.lastFrame || undefined;

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
          const activeApiKey = getApiKeyForProvider(provider);
          if (!activeApiKey) {
            throw new Error('Missing API key for selected provider.');
          }
          const modelName = provider === 'azure' ? azureSettings.videoDeployment : 'sora-2';

          const segmentFirstFrame = i === 0 ? selectedFirstFile : undefined;
          const segmentLastFrame =
            i === formData.numSegments - 1 ? selectedLastFile : undefined;
          const { width, height } = parseSize(formData.size);
          const resizedFirstFrame = segmentFirstFrame
            ? await resizeImageBlob(segmentFirstFrame, width, height)
            : undefined;
          const resizedLastFrame = segmentLastFrame
            ? await resizeImageBlob(segmentLastFrame, width, height)
            : undefined;
          const referenceFrame =
            provider === 'openai' ? lastFrameBlob || resizedFirstFrame : lastFrameBlob;

          // Create video job with frame continuity (if not first segment)
          const job = await openaiService.createVideo({
            provider,
            providerConfig: getProviderConfig(provider),
            apiKey: activeApiKey,
            prompt: formData.prompt,
            seconds: String(formData.seconds), // Convert to string for OpenAI API
            size: formData.size,
            model: modelName,
            inputReference: referenceFrame, // Use last frame from previous video
            firstFrame: provider === 'azure' ? resizedFirstFrame || undefined : undefined,
            lastFrame: provider === 'azure' ? resizedLastFrame || undefined : undefined,
          });

          // Poll for completion
          await openaiService.pollUntilComplete(job.id, activeApiKey, getProviderConfig(provider), (segmentProgress) => {
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
          const blob = await openaiService.downloadVideo(job.id, activeApiKey, getProviderConfig(provider));
          videoBlobs.push(blob);

          // Mark segment as completed
          segment.status = 'completed';
          segment.progress = 100;
          segment.videoBlob = blob;
          setSegments([...segmentList]);

          // Store OpenAI video ID and creation time in segment
          segment.openaiVideoId = job.id;
          segment.createdAt = Date.now();
          setSegments([...segmentList]);

          // Save metadata for this segment to history
          // CRITICAL: Use segment.prompt (not formData.prompt) to capture the actual prompt used
          // This works for both manual generation and AI-planned segments
          const segmentMetadata: VideoMetadata = {
            openaiVideoId: job.id,
            localId: `segment-${i}-${Date.now()}`,
            prompt: segment.prompt,  // Use segment.prompt for accurate prompt tracking
            provider,
            ...(provider === 'azure' ? { azure: getAzureMetadata() } : {}),
            parameters: {
              seconds: formData.seconds,
              size: formData.size,
              model: modelName,
            },
            createdAt: Date.now(),
            expiresAt: calculateExpiresAt(Date.now()),
            remixCount: 0,
            isExpired: false,
          };
          saveVideoMetadata(segmentMetadata);

          // Extract last frame for next segment (if not the last segment)
          if (i < formData.numSegments - 1) {
            setStatus(`Extracting frame from segment ${i + 1} for continuity...`);
            lastFrameBlob = await extractLastFrame(blob);
          }
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
    setSelectedFirstFrame(null);
    setSelectedLastFrame(null);
  };

  const handleRemix = async (newPrompt: string, keepSettings: boolean) => {
    if (!selectedVideoForRemix) return;

    const remixProvider = keepSettings ? selectedVideoForRemix.provider : provider;
    const providerError = validateProviderSettings(
      remixProvider,
      keepSettings ? selectedVideoForRemix.azure : undefined
    );
    if (providerError) {
      setError(providerError);
      return;
    }

    const activeApiKey = getApiKeyForProvider(remixProvider);
    if (!activeApiKey) {
      setError('Missing API key for selected provider.');
      return;
    }

    // Check expiration
    if (isVideoExpired(selectedVideoForRemix)) {
      setError('This video has expired. Remix is only available for 24 hours after generation.');
      return;
    }

    setError(null);
    reset();
    setProcessing(true);

    try {
      setStatus('Creating remix...');

      // Use original settings if keepSettings is true
      const config = keepSettings
        ? {
            prompt: newPrompt,
            seconds: selectedVideoForRemix.parameters.seconds,
            size: selectedVideoForRemix.parameters.size,
            model: selectedVideoForRemix.parameters.model,
            provider: selectedVideoForRemix.provider,
            azure: selectedVideoForRemix.azure,
          }
        : {
            prompt: newPrompt,
            seconds: 8,
            size: '1280x720',
            model: remixProvider === 'azure' ? azureSettings.videoDeployment : 'sora-2',
            provider: remixProvider,
            azure: remixProvider === 'azure' ? getAzureMetadata() : undefined,
          };

      // Create segment
      const segment: VideoSegment = {
        id: 'remix-segment-0',
        prompt: newPrompt,
        status: 'generating',
        progress: 0,
        createdAt: Date.now(),
      };
      const segmentList = [segment];
      setSegments(segmentList);

      // Call OpenAI with remixedFromVideoId
      const job = await openaiService.createVideo({
        provider: config.provider,
        providerConfig: getProviderConfig(remixProvider, keepSettings ? selectedVideoForRemix.azure : undefined),
        apiKey: activeApiKey,
        prompt: newPrompt,
        seconds: String(config.seconds),
        size: config.size,
        model: config.model,
        remixedFromVideoId: selectedVideoForRemix.openaiVideoId, // KEY: Pass original video ID
      });

      // Store OpenAI video ID immediately
      segment.openaiVideoId = job.id;
      setSegments([...segmentList]);

      // Poll for completion
      await openaiService.pollUntilComplete(
        job.id,
        activeApiKey,
        getProviderConfig(remixProvider, keepSettings ? selectedVideoForRemix.azure : undefined),
        (segmentProgress) => {
        segment.progress = segmentProgress;
        setSegments([...segmentList]);
        }
      );

      // Download
      setStatus('Downloading remixed video...');
      const blob = await openaiService.downloadVideo(
        job.id,
        activeApiKey,
        getProviderConfig(remixProvider, keepSettings ? selectedVideoForRemix.azure : undefined)
      );
      const url = URL.createObjectURL(blob);

      // Update segment
      segment.status = 'completed';
      segment.progress = 100;
      segment.videoBlob = blob;
      segment.videoUrl = url;
      setSegments([...segmentList]);

      setFinalVideo(url);
      setStatus('Remix complete!');

      // Save metadata to history with relationship
      const remixMetadata: VideoMetadata = {
        openaiVideoId: job.id,
        localId: `remix-${Date.now()}`,
        prompt: newPrompt,
        provider: config.provider,
        ...(config.provider === 'azure' && config.azure ? { azure: config.azure } : {}),
        parameters: {
          seconds: config.seconds,
          size: config.size,
          model: config.model,
        },
        createdAt: Date.now(),
        expiresAt: calculateExpiresAt(Date.now()),
        remixedFrom: selectedVideoForRemix.openaiVideoId, // Link to parent
        remixCount: 0,
        isExpired: false,
      };

      saveVideoMetadata(remixMetadata);

      // Increment parent's remix count
      incrementRemixCount(selectedVideoForRemix.openaiVideoId);

      // Clear selection
      selectVideoForRemix(null);
    } catch (err) {
      console.error('[App] Remix failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Remix failed';
      setError(errorMessage);
      if (segments.length > 0) {
        const seg = segments[0];
        seg.status = 'failed';
        seg.error = errorMessage;
        setSegments([...segments]);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleRemixClick = (metadata: VideoMetadata) => {
    if (isVideoExpired(metadata)) {
      alert('This video has expired. Remix is only available for 24 hours after generation.');
      return;
    }
    selectVideoForRemix(metadata);
    setShowRemixModal(true);
  };

  const handleDeleteMetadata = (openaiVideoId: string) => {
    if (confirm('Delete this video from history? (This only removes metadata, not the video file if you downloaded it)')) {
      deleteVideoMetadata(openaiVideoId);
    }
  };

  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="w-16 h-16 mx-auto flex items-center justify-center text-4xl">
              🎬
            </div>
          </div>
          <h1 className="text-7xl font-serif mb-6 text-gray-900 tracking-tight leading-tight" style={{ fontFamily: 'Lora, Georgia, serif' }}>
            Create cinematic videos with natural language
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            Generate extended AI videos with Sora 2 on OpenAI or Azure OpenAI. Seamless frame continuity, AI-powered planning, and browser-based processing.
          </p>
        </header>

        {showMobileWarning && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg mb-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <span className="text-amber-600 text-xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-900 mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Mobile Browser Detected
                </h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  This application works best on desktop browsers. Mobile devices may have
                  memory limitations that could cause issues with large videos.
                </p>
              </div>
              <button
                onClick={() => setShowMobileWarning(false)}
                className="text-amber-600 hover:text-amber-900 transition-colors text-lg"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 max-w-3xl mx-auto">
          {showSettings ? (
            <SettingsPage onClose={() => setShowSettings(false)} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Generation</h2>
                  <p className="text-sm text-gray-600">
                    Active provider: {provider === 'openai' ? 'OpenAI' : 'Azure OpenAI'}
                  </p>
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all font-medium"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Settings
                </button>
              </div>

              {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

              {!ffmpegReady && !error && (
                <div className="text-center py-16">
                  <div className="relative inline-block">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-gray-900 mx-auto mb-6"></div>
                  </div>
                  <p className="text-gray-900 font-medium text-base mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Loading FFmpeg.wasm...</p>
                  <p className="text-gray-500 text-sm">Preparing video processing engine</p>
                </div>
              )}

              {ffmpegReady && !finalVideoUrl && !plannedSegments && (
                <>
                  <div className="flex items-center gap-3 mb-8">
                    <button
                      type="button"
                      onClick={() => setActiveTab('video')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                        activeTab === 'video'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('image')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                        activeTab === 'image'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      Image
                    </button>
                  </div>

                  {activeTab === 'video' ? (
                    <PromptForm
                      onSubmit={handleGenerate}
                      onPlanWithAI={handlePlanWithAI}
                      firstFrame={selectedFirstFrame?.file || null}
                      lastFrame={selectedLastFrame?.file || null}
                      onFirstFrameChange={(file) => setSelectedFirstFrame(file ? {
                        id: `manual-first-${Date.now()}`,
                        prompt: 'Manual upload',
                        url: URL.createObjectURL(file),
                        file,
                      } : null)}
                      onLastFrameChange={(file) => setSelectedLastFrame(file ? {
                        id: `manual-last-${Date.now()}`,
                        prompt: 'Manual upload',
                        url: URL.createObjectURL(file),
                        file,
                      } : null)}
                      disabled={isProcessing || isPlanning}
                    />
                  ) : (
                    <ImageGenerator
                      images={generatedImages}
                      isGenerating={isGeneratingImages}
                      error={imageGenerationError}
                      onGenerate={handleGenerateImages}
                      onSelectFirstFrame={handleSelectFirstFrame}
                      onSelectLastFrame={handleSelectLastFrame}
                      selectedFirstFrameId={selectedFirstFrame?.id || null}
                      selectedLastFrameId={selectedLastFrame?.id || null}
                      disabled={isProcessing || isPlanning}
                    />
                  )}
                </>
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
            </>
          )}
        </div>

        {/* Video History Section */}
        {videoHistory.length > 0 && (
          <section className="mb-12 mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">📚 Video History</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Video metadata saved for 24 hours. Remix any video before it expires.
                </p>
              </div>
              <button
                onClick={() => setShowVideoHistory(!showVideoHistory)}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                {showVideoHistory ? 'Hide' : 'Show'} History ({videoHistory.length})
              </button>
            </div>

            {showVideoHistory && (
              <VideoHistoryGallery
                videoHistory={videoHistory}
                onRemix={handleRemixClick}
                onDelete={handleDeleteMetadata}
                openaiApiKey={openaiApiKey}
                azureApiKey={azureSettings.apiKey}
              />
            )}
          </section>
        )}

        {/* Remix Modal */}
        <RemixModal
          originalMetadata={selectedVideoForRemix}
          isOpen={showRemixModal}
          onClose={() => {
            setShowRemixModal(false);
            selectVideoForRemix(null);
          }}
          onSubmit={handleRemix}
        />

        <footer className="text-center mt-20 text-sm text-gray-500">
          <p className="mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            Made with React, TypeScript, Vercel Edge Functions, and FFmpeg.wasm
          </p>
          <p className="text-xs text-gray-400">
            🔒 Your API key and videos never leave your device
          </p>
        </footer>
      </div>
    </div>
  );
}
