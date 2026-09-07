export type Crop = { x: number; y: number; width: number; height: number };

export type CropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function constrainCrop(crop: Crop, width: number, height: number): Crop {
  const w = clamp(crop.width, 1, width), h = clamp(crop.height, 1, height);
  return { x: clamp(crop.x, 0, width - w), y: clamp(crop.y, 0, height - h), width: w, height: h };
}

// Work in source pixels; CSS scaling never changes the exported selection.
export function dragCrop(crop: Crop, handle: CropHandle, dx: number, dy: number, width: number, height: number): Crop {
  if (handle === 'move') return constrainCrop({ ...crop, x: crop.x + dx, y: crop.y + dy }, width, height);
  let left = crop.x, top = crop.y, right = left + crop.width, bottom = top + crop.height;
  if (handle.includes('w')) left = clamp(left + dx, 0, right - 1);
  if (handle.includes('e')) right = clamp(right + dx, left + 1, width);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - 1);
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + 1, height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function cropBounds(width: number, height: number, aspect: number, zoom: number, x: number, y: number): Crop {
  const cropWidth = Math.min(width, height * aspect) / zoom;
  const cropHeight = cropWidth / aspect;
  return { x: (width - cropWidth) * x, y: (height - cropHeight) * y, width: cropWidth, height: cropHeight };
}

export function rotateImage(image: HTMLImageElement, turns: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Bound working memory on large phone photos while retaining ample export resolution.
  const scale = Math.min(1, 3000 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale)), height = Math.max(1, Math.round(image.naturalHeight * scale));
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
