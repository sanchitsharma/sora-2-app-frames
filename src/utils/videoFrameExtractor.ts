/**
 * Extract the last frame from a video blob as an image blob
 * Used for frame continuity between video segments
 */
export async function extractLastFrame(videoBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoBlob);

    video.addEventListener('loadedmetadata', () => {
      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to the last frame (duration - 0.1 seconds to ensure we get a valid frame)
      video.currentTime = Math.max(0, video.duration - 0.1);
    });

    video.addEventListener('seeked', () => {
      try {
        // Draw the current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(video.src);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/jpeg',
          0.95 // High quality
        );
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src);
      reject(new Error(`Video error: ${video.error?.message || 'Unknown error'}`));
    });
  });
}
