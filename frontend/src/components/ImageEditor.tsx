import { useEffect, useRef, useState } from 'react';

type Props = {
  file: File;
  onCancel: () => void;
  onSave: (file: File) => Promise<void>;
};

const OUTPUT_SIZE = 1200;

export default function ImageEditor({ file, onCancel, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setSource(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const quarterTurn = Math.abs(rotation / 90) % 2 === 1;
    const rotatedWidth = quarterTurn ? source.height : source.width;
    const rotatedHeight = quarterTurn ? source.width : source.height;
    const scale = Math.max(canvas.width / rotatedWidth, canvas.height / rotatedHeight) * zoom;
    const maxX = Math.max(0, (rotatedWidth * scale - canvas.width) / 2);
    const maxY = Math.max(0, (rotatedHeight * scale - canvas.height) / 2);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 + offsetX * maxX, canvas.height / 2 + offsetY * maxY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(source, -source.width / 2, -source.height / 2);
    ctx.restore();
  }, [source, rotation, zoom, offsetX, offsetY]);

  const rotate = (amount: number) => {
    setRotation((value) => (value + amount + 360) % 360);
    setOffsetX(0);
    setOffsetY(0);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Could not prepare image');
      const name = `${file.name.replace(/\.[^.]+$/, '') || 'bean'}-edited.jpg`;
      await onSave(new File([blob], name, { type: 'image/jpeg' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="image-editor-title">
      <div className="modal-card card stack image-editor">
        <div className="modal-header">
          <div>
            <h3 id="image-editor-title">Crop bean photo</h3>
            <p className="label">Move and zoom the photo inside the square. You can rotate it before saving.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close image editor">Close</button>
        </div>
        <canvas ref={canvasRef} width={OUTPUT_SIZE} height={OUTPUT_SIZE} aria-label="Cropped photo preview" />
        <div className="inline editor-actions">
          <button type="button" onClick={() => rotate(-90)} aria-label="Rotate photo left">↶ Rotate left</button>
          <button type="button" onClick={() => rotate(90)} aria-label="Rotate photo right">↷ Rotate right</button>
          <button type="button" onClick={() => { setZoom(1); setOffsetX(0); setOffsetY(0); }}>Reset crop</button>
        </div>
        <label className="stack"><span className="label">Zoom</span><input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
        <div className="grid two">
          <label className="stack"><span className="label">Move left / right</span><input type="range" min="-1" max="1" step="0.02" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} /></label>
          <label className="stack"><span className="label">Move up / down</span><input type="range" min="-1" max="1" step="0.02" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} /></label>
        </div>
        <button className="primary" type="button" disabled={saving || !source} onClick={save}>{saving ? 'Saving photo…' : 'Use this photo'}</button>
      </div>
    </div>
  );
}
