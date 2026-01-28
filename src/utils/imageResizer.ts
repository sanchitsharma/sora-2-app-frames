export async function resizeImageBlob(
  blob: Blob,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error('Failed to resize image'));
          return;
        }
        resolve(result);
      }, 'image/png', 0.95);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for resize'));
    };

    image.src = objectUrl;
  });
}
