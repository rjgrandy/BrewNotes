export type Crop = { x: number; y: number; width: number; height: number };

export function cropBounds(width: number, height: number, aspect: number, zoom: number, x: number, y: number): Crop {
  const cropWidth = Math.min(width, height * aspect) / zoom;
  const cropHeight = cropWidth / aspect;
  return { x: (width - cropWidth) * x, y: (height - cropHeight) * y, width: cropWidth, height: cropHeight };
}

export function rotateImage(image: HTMLImageElement, turns: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Bound working memory on large phone photos while retaining ample export resolution.
  const scale = Math.min(1, 3000 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * scale), height = Math.round(image.naturalHeight * scale);
  canvas.width = turns % 2 ? height : width;
  canvas.height = turns % 2 ? width : height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Photo editing is unavailable in this browser.');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(turns * Math.PI / 2);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  return canvas;
}

export async function exportCrop(source: HTMLCanvasElement, crop: Crop): Promise<File> {
  const output = document.createElement('canvas');
  const scale = Math.min(1, 2400 / Math.max(crop.width, crop.height));
  output.width = Math.max(1, Math.round(crop.width * scale));
  output.height = Math.max(1, Math.round(crop.height * scale));
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('Unable to prepare your photo.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height);
  const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error('Unable to save this photo.')), 'image/jpeg', 0.92));
  return new File([blob], 'brewnotes-photo.jpg', { type: 'image/jpeg' });
}
