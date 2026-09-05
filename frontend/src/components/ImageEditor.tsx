import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  file: File;
  title?: string;
  onSave: (blob: Blob) => Promise<void> | void;
  onCancel: () => void;
};

type AspectOption = { label: string; ratio: number | null };

const ASPECTS: AspectOption[] = [
  { label: 'Square', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '3:4', ratio: 3 / 4 },
  { label: 'Wide', ratio: 16 / 9 }
];

const MAX_OUTPUT = 1600;

export default function ImageEditor({ file, title = 'Edit Photo', onSave, onCancel }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [aspect, setAspect] = useState<number>(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setError('');
      setImage(img);
    };
    img.onerror = () => setError('This image could not be opened. Try choosing a JPEG, PNG, or WebP photo.');
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const measure = () => {
      if (frameRef.current) {
        setFrameWidth(frameRef.current.clientWidth);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (frameRef.current) observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [image]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, saving]);

  const frameHeight = useMemo(() => {
    if (!frameWidth) return 0;
    const raw = frameWidth / aspect;
    return Math.min(raw, window.innerHeight * 0.5);
  }, [frameWidth, aspect]);

  const effectiveSize = useMemo(() => {
    if (!image) return { w: 1, h: 1 };
    const swapped = rotation % 180 !== 0;
    return {
      w: swapped ? image.naturalHeight : image.naturalWidth,
      h: swapped ? image.naturalWidth : image.naturalHeight
    };
  }, [image, rotation]);

  const baseScale = useMemo(() => {
    if (!image || !frameWidth || !frameHeight) return 1;
    return Math.max(frameWidth / effectiveSize.w, frameHeight / effectiveSize.h);
  }, [image, frameWidth, frameHeight, effectiveSize]);

  const scale = baseScale * zoom;

  const clampOffset = useCallback(
    (next: { x: number; y: number }, atScale: number) => {
      const maxX = Math.max(0, (effectiveSize.w * atScale - frameWidth) / 2);
      const maxY = Math.max(0, (effectiveSize.h * atScale - frameHeight) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y))
      };
    },
    [effectiveSize, frameWidth, frameHeight]
  );

  useEffect(() => {
    setOffset((prev) => clampOffset(prev, scale));
  }, [scale, clampOffset]);

  const handlePointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart.current.distance > 0) {
        const nextZoom = Math.min(5, Math.max(1, (pinchStart.current.zoom * distance) / pinchStart.current.distance));
        setZoom(nextZoom);
      }
      return;
    }

    setOffset((prev) => clampOffset({ x: prev.x + current.x - previous.x, y: prev.y + current.y - previous.y }, scale));
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinchStart.current = null;
    }
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    setZoom((prev) => Math.min(5, Math.max(1, prev - event.deltaY * 0.002)));
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    if (!image || !frameWidth || !frameHeight || saving) return;
    setSaving(true);
    setError('');
    try {
      // frameWidth / scale = source pixels visible across the crop window.
      const outputWidth = Math.max(1, Math.min(MAX_OUTPUT, Math.round(frameWidth / scale)));
      const k = outputWidth / frameWidth;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(frameWidth * k));
      canvas.height = Math.max(1, Math.round(frameHeight * k));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2 + offset.x * k, canvas.height / 2 + offset.y * k);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale * k, scale * k);
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Could not export image');
      await onSave(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the edited photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !saving && onCancel()}>
      <div
        className="card stack modal-card editor-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Cancel photo editing">
            Cancel
          </button>
        </div>
        <div
          ref={frameRef}
          className="editor-frame"
          style={{ height: frameHeight || 240 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          {image && (
            <img
              src={image.src}
              alt="Photo being edited"
              draggable={false}
              style={{
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`
              }}
            />
          )}
          <div className="editor-grid" aria-hidden="true" />
          {!image && !error && <div className="editor-status">Loading photo…</div>}
        </div>
        <p className="editor-help">Drag to reposition. Pinch or use the slider to zoom.</p>
        <label className="stack">
          <span className="label">Zoom</span>
          <input
            type="range"
            min="1"
            max="5"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="inline">
            {ASPECTS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={aspect === option.ratio ? 'chip active' : 'chip'}
                onClick={() => option.ratio && setAspect(option.ratio)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={rotate} disabled={!image || saving}>
            Rotate 90°
          </button>
        </div>
        {error && <div className="editor-error" role="alert">{error}</div>}
        <button className="primary" onClick={handleSave} disabled={!image || saving}>
          {saving ? 'Saving…' : 'Save Photo'}
        </button>
      </div>
    </div>
  );
}
