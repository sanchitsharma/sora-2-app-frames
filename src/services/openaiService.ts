import axios from 'axios';
import type { CreateVideoRequest, ProviderConfig, VideoJob } from '../types';

const API_BASE = '/api'; // Vercel Edge Functions

export const openaiService = {
  /**
   * Create a video generation job via Vercel Edge Function proxy
   * @param request - Video creation request parameters
   * @returns Video job with id and status
   */
  async createVideo(request: CreateVideoRequest): Promise<VideoJob> {
    // If image references are provided, use FormData for multipart/form-data
    if (request.inputReference || request.firstFrame || request.lastFrame) {
      const formData = new FormData();
      formData.append('provider', request.provider);
      formData.append('providerConfig', JSON.stringify(request.providerConfig));
      formData.append('apiKey', request.apiKey);
      formData.append('prompt', request.prompt);
      formData.append('seconds', request.seconds);
      formData.append('size', request.size);
      formData.append('model', request.model);
      if (request.inputReference) {
        formData.append('inputReference', request.inputReference, 'frame.jpg');
      }
      if (request.firstFrame) {
        formData.append('firstFrame', request.firstFrame, 'first-frame.jpg');
      }
      if (request.lastFrame) {
        formData.append('lastFrame', request.lastFrame, 'last-frame.jpg');
      }

      if (request.remixedFromVideoId) {
        formData.append('remixedFromVideoId', request.remixedFromVideoId);
      }

      const response = await axios.post(`${API_BASE}/proxy-create-video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    // Otherwise use JSON
    const response = await axios.post(`${API_BASE}/proxy-create-video`, request);
    return response.data;
  },

  /**
   * Get the status of a video generation job
   * @param videoId - The video job ID
   * @param apiKey - OpenAI API key
   * @returns Current job status and progress
   */
  async getVideoStatus(
    videoId: string,
    apiKey: string,
    providerConfig: ProviderConfig
  ): Promise<VideoJob> {
    const response = await axios.get(`${API_BASE}/proxy-get-status`, {
      params: {
        videoId,
        provider: providerConfig.provider,
        providerConfig: JSON.stringify(providerConfig),
      },
      headers: { 'x-api-key': apiKey },
    });
    return response.data;
  },

  /**
   * Poll a video job until it completes or fails
   * @param videoId - The video job ID
   * @param apiKey - OpenAI API key
   * @param onProgress - Callback for progress updates (0-100)
   * @returns Completed job data
   */
  async pollUntilComplete(
    videoId: string,
    apiKey: string,
    providerConfig: ProviderConfig,
    onProgress?: (progress: number) => void
  ): Promise<VideoJob> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const job = await this.getVideoStatus(videoId, apiKey, providerConfig);

      // Update progress if callback provided
      if (onProgress && job.progress !== undefined) {
        onProgress(job.progress);
      }

      // Check if completed
      if (job.status === 'completed') {
        return job;
      }

      // Check if failed
      if (job.status === 'failed') {
        throw new Error(job.error?.message || 'Video generation failed');
      }

      // Wait 2 seconds before next poll (avoid rate limiting)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  },

  /**
   * Download video content directly from OpenAI or Azure OpenAI
   * IMPORTANT: This bypasses the proxy and downloads directly from the provider
   * @param videoId - The video job ID
   * @param apiKey - OpenAI API key
   * @returns Video blob
   */
  async downloadVideo(
    videoId: string,
    apiKey: string,
    providerConfig: ProviderConfig
  ): Promise<Blob> {
    const baseUrl =
      providerConfig.provider === 'openai'
        ? 'https://api.openai.com/v1'
        : `${providerConfig.azure.endpoint}/openai/v1`;

    const url =
      providerConfig.provider === 'azure' && providerConfig.azure.apiType === 'deployments'
        ? `${providerConfig.azure.endpoint}/openai/deployments/${providerConfig.azure.videoDeployment}/videos/${videoId}/content`
        : `${baseUrl}/videos/${videoId}/content`;

    const params =
      providerConfig.provider === 'azure' && providerConfig.azure.apiType === 'deployments'
        ? { 'api-version': providerConfig.azure.apiVersion, variant: 'video' }
        : { variant: 'video' };

    const headers =
      providerConfig.provider === 'azure'
        ? { 'api-key': apiKey }
        : { 'Authorization': `Bearer ${apiKey}` };

    const response = await axios.get(url, {
      params,
      headers,
      responseType: 'blob',
    });
    return response.data;
  },
};
