import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class VideoService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  /**
   * Initialize FFmpeg.wasm
   * CRITICAL: This takes 5-10 seconds - call on app mount, not on button click
   */
  async initialize(): Promise<void> {
    if (this.loaded) {
      console.log('[VideoService] FFmpeg already loaded');
      return;
    }

    console.log('[VideoService] Loading FFmpeg.wasm...');
    this.ffmpeg = new FFmpeg();

    // Load FFmpeg.wasm from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
    console.log('[VideoService] FFmpeg.wasm loaded successfully');
  }

  /**
   * Concatenate multiple video blobs into a single video
   * Uses `-c copy` for fast concatenation without re-encoding
   * @param videoBlobs - Array of video blobs to concatenate
   * @param onProgress - Callback for progress updates (0-100)
   * @returns Concatenated video blob
   */
  async concatenateVideos(
    videoBlobs: Blob[],
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized. Call initialize() first.');
    }

    if (videoBlobs.length === 0) {
      throw new Error('No video blobs provided');
    }

    // Single video - no concatenation needed
    if (videoBlobs.length === 1) {
      return videoBlobs[0];
    }

    console.log(`[VideoService] Concatenating ${videoBlobs.length} videos...`);

    try {
      // Write all videos to virtual filesystem
      for (let i = 0; i < videoBlobs.length; i++) {
        const filename = `input_${i}.mp4`;
        console.log(`[VideoService] Writing ${filename} to virtual FS...`);
        await this.ffmpeg.writeFile(filename, await fetchFile(videoBlobs[i]));
      }

      // Create concat file list
      const concatList = videoBlobs
        .map((_, i) => `file 'input_${i}.mp4'`)
        .join('\n');
      await this.ffmpeg.writeFile('concat.txt', concatList);

      // Progress tracking
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress }) => {
          onProgress(Math.round(progress * 100));
        });
      }

      // Concatenate without re-encoding (fast)
      // -f concat: Use concat demuxer
      // -safe 0: Allow unsafe file paths
      // -i concat.txt: Input file list
      // -c copy: Copy streams without re-encoding (100x faster)
      console.log('[VideoService] Running FFmpeg concat...');
      await this.ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        'output.mp4',
      ]);

      // Read result
      console.log('[VideoService] Reading output file...');
      const data = await this.ffmpeg.readFile('output.mp4');
      // Convert to standard Uint8Array to ensure compatibility
      const uint8Array = new Uint8Array(data as Uint8Array);
      const blob = new Blob([uint8Array], { type: 'video/mp4' });

      // Cleanup
      await this.cleanup(videoBlobs.length);

      console.log(`[VideoService] Concatenation complete! Size: ${blob.size} bytes`);
      return blob;
    } catch (error) {
      console.error('[VideoService] Concatenation failed:', error);
      // Attempt cleanup even on error
      try {
        await this.cleanup(videoBlobs.length);
      } catch (cleanupError) {
        console.warn('[VideoService] Cleanup error:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Clean up temporary files from virtual filesystem
   * @param numVideos - Number of input videos to clean up
   */
  private async cleanup(numVideos: number): Promise<void> {
    if (!this.ffmpeg) return;

    console.log('[VideoService] Cleaning up temporary files...');
    try {
      for (let i = 0; i < numVideos; i++) {
        await this.ffmpeg.deleteFile(`input_${i}.mp4`);
      }
      await this.ffmpeg.deleteFile('concat.txt');
      await this.ffmpeg.deleteFile('output.mp4');
    } catch (error) {
      console.warn('[VideoService] Cleanup warning:', error);
    }
  }

  /**
   * Check if FFmpeg is loaded and ready
   */
  isReady(): boolean {
    return this.loaded;
  }
}

// Export singleton instance
export const videoService = new VideoService();
