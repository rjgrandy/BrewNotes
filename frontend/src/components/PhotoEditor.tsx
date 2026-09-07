import { CSSProperties, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Crop as CropIcon, RotateCcw, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/Dialog';
import { Crop, CropHandle, constrainCrop, cropBounds, dragCrop, exportCrop, rotateImage } from '../utils/photo';

const handles: { handle: CropHandle; label: string; x: number; y: number }[] = [
  { handle: 'nw', label: 'top left', x: 0, y: 0 }, { handle: 'n', label: 'top', x: 50, y: 0 },
  { handle: 'ne', label: 'top right', x: 100, y: 0 }, { handle: 'e', label: 'right', x: 100, y: 50 },
  { handle: 'se', label: 'bottom right', x: 100, y: 100 }, { handle: 's', label: 'bottom', x: 50, y: 100 },
  { handle: 'sw', label: 'bottom left', x: 0, y: 100 }, { handle: 'w', label: 'left', x: 0, y: 50 }
];

export default function PhotoEditor({ source, onCancel, onSave }: { source: File | string; onCancel: () => void; onSave: (file: File) => Promise<void> }) {
  const [image, setImage] = useState<HTMLImageElement>();
  const [turns, setTurns] = useState(0);
  const [shape, setShape] = useState('free');
  const [freeCrop, setFreeCrop] = useState<Crop>();
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const preview = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; crop: Crop; handle: CropHandle; scaleX: number; scaleY: number }>();
  useEffect(() => {
    let active = true;
    setImage(undefined); setError(''); setTurns(0); setShape('free'); setFreeCrop(undefined);
    setZoom(1); setPosition({ x: 0.5, y: 0.5 });
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const photo = new Image();
    photo.onload = () => { if (active) setImage(photo); };
    photo.onerror = () => { if (active) setError('This photo could not be opened. Try a JPEG, PNG, or WebP image.'); };
    photo.src = url;
    return () => { active = false; if (typeof source !== 'string') URL.revokeObjectURL(url); };
  }, [source]);
  const working = useMemo(() => {
    if (!image) return {};
    try { return { canvas: rotateImage(image, turns) }; }
    catch (err) { return { error: err instanceof Error ? err.message : 'Unable to open photo editor.' }; }
  }, [image, turns]);
  const rotated = working.canvas;
  const aspect = shape === 'original' && rotated ? rotated.width / rotated.height : Number(shape);
  const crop = rotated ? shape === 'free'
    ? constrainCrop(freeCrop ?? { x: 0, y: 0, width: rotated.width, height: rotated.height }, rotated.width, rotated.height)
    : cropBounds(rotated.width, rotated.height, aspect, zoom, position.x, position.y) : undefined;
  useEffect(() => {
    const canvas = preview.current;
    if (!canvas || !rotated) return;
    const scale = Math.min(1, 900 / Math.max(rotated.width, rotated.height));
    canvas.width = Math.max(1, Math.round(rotated.width * scale));
    canvas.height = Math.max(1, Math.round(rotated.height * scale));
    canvas.getContext('2d')?.drawImage(rotated, 0, 0, canvas.width, canvas.height);
  }, [rotated]);
  const resetPosition = () => { setZoom(1); setPosition({ x: 0.5, y: 0.5 }); setFreeCrop(undefined); drag.current = undefined; };
  const updateCrop = (next: Crop) => {
    if (!rotated) return;
    if (shape === 'free') setFreeCrop(constrainCrop(next, rotated.width, rotated.height));
    else setPosition({ x: next.x / Math.max(1, rotated.width - next.width), y: next.y / Math.max(1, rotated.height - next.height) });
  };
  const startDrag = (event: ReactPointerEvent, handle: CropHandle) => {
    if (busy || !crop || !rotated || !preview.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = preview.current.getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY, crop, handle, scaleX: rotated.width / rect.width, scaleY: rotated.height / rect.height };
  };
  const save = async () => {
    if (!rotated || !crop || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onSave(await exportCrop(rotated, crop)); onCancel(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Upload failed. Your edit is still here; try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const controls = crop && rotated ? shape === 'free' ? [
    { label: 'Crop width', value: crop.width, min: 1, max: rotated.width, change: (width: number) => updateCrop({ ...crop, width }) },
    { label: 'Crop height', value: crop.height, min: 1, max: rotated.height, change: (height: number) => updateCrop({ ...crop, height }) },
    { label: 'Horizontal position', value: crop.x, min: 0, max: rotated.width - crop.width, change: (x: number) => updateCrop({ ...crop, x }) },
    { label: 'Vertical position', value: crop.y, min: 0, max: rotated.height - crop.height, change: (y: number) => updateCrop({ ...crop, y }) }
  ] : [
    { label: 'Zoom', value: zoom, min: 1, max: 4, change: setZoom },
    { label: 'Horizontal position', value: position.x, min: 0, max: 1, change: (x: number) => setPosition(p => ({ ...p, x })), disabled: rotated.width - crop.width < 1 },
    { label: 'Vertical position', value: position.y, min: 0, max: 1, change: (y: number) => setPosition(p => ({ ...p, y })), disabled: rotated.height - crop.height < 1 }
  ] : [];

  return <Dialog open onOpenChange={open => { if (!open && !lock.current) onCancel(); }}><DialogContent wide className="photo-editor-dialog !flex !flex-col !overflow-hidden">
    <DialogTitle className="flex shrink-0 items-center gap-2 text-xl font-bold"><CropIcon size={21} /> Frame your photo</DialogTitle>
    <DialogDescription className="mt-1 shrink-0 text-sm text-muted">{shape === 'free' ? 'Drag the edges or corners to crop freely. Drag inside to reposition.' : 'Choose a shape, then zoom and drag the selection to frame your photo.'}</DialogDescription>
    <div className="min-h-0 overflow-y-auto pr-1">
      {(error || working.error) && <p role="alert" className="mt-3 text-sm text-danger">{error || working.error}</p>}
      {!image && !error && <p role="status" className="py-10 text-center text-muted">Opening photo…</p>}
      {rotated && crop && <>
        <div className="photo-stage mt-4">
          <div className="crop-source" style={{ aspectRatio: rotated.width / rotated.height, '--source-aspect': rotated.width / rotated.height } as CSSProperties}
            onPointerMove={event => {
              if (!drag.current || busy) return;
              const d = drag.current;
              updateCrop(dragCrop(d.crop, d.handle, (event.clientX - d.x) * d.scaleX, (event.clientY - d.y) * d.scaleY, rotated.width, rotated.height));
            }} onPointerUp={() => { drag.current = undefined; }} onPointerCancel={() => { drag.current = undefined; }} onLostPointerCapture={() => { drag.current = undefined; }}>
            <canvas ref={preview} aria-label="Source photo for cropping" />
            <div className="crop-selection" data-testid="crop-selection" style={{ left: `${crop.x / rotated.width * 100}%`, top: `${crop.y / rotated.height * 100}%`, width: `${crop.width / rotated.width * 100}%`, height: `${crop.height / rotated.height * 100}%` }}
              onPointerDown={event => startDrag(event, 'move')}>
              <span className="crop-thirds" aria-hidden="true" />
              {shape === 'free' && handles.map(({ handle, label, x, y }) => <button key={handle} type="button" className={`crop-handle crop-handle-${handle}`} style={{ left: `${x}%`, top: `${y}%` }} aria-label={`Resize crop ${label}`} disabled={busy}
                onPointerDown={event => startDrag(event, handle)} onKeyDown={event => {
                  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                  event.preventDefault(); event.stopPropagation();
                  const step = event.shiftKey ? 10 : 1;
                  updateCrop(dragCrop(crop, handle, event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0, rotated.width, rotated.height));
                }} />)}
            </div>
          </div>
        </div>
        <p className="mt-2 text-right font-mono text-xs text-muted" aria-live="polite">Selection · {Math.round(crop.width)} × {Math.round(crop.height)} px</p>
        <fieldset disabled={busy} className="mt-3 flex flex-col gap-3">
          <div className="crop-toolbar">
            <label className="flex min-w-0 flex-col gap-1"><span className="field-label">Crop shape</span><select className="input" value={shape} onChange={event => {
              const next = event.target.value;
              resetPosition(); if (next === 'free') setFreeCrop(crop); setShape(next);
            }}><option value="free">Free</option><option value="original">Original</option><option value="1">Square</option><option value="1.3333333333333333">Landscape 4:3</option><option value="0.75">Portrait 3:4</option><option value="1.7777777777777777">Wide 16:9</option></select></label>
            <button type="button" className="btn" aria-label="Rotate left" onClick={() => { setTurns(t => (t + 3) % 4); resetPosition(); }}><RotateCcw size={18} /></button>
            <button type="button" className="btn" aria-label="Rotate right" onClick={() => { setTurns(t => (t + 1) % 4); resetPosition(); }}><RotateCw size={18} /></button>
            <button type="button" className="btn" onClick={() => { setTurns(0); setShape('free'); resetPosition(); }}>Reset</button>
          </div>
          <div className={`grid gap-3 ${shape === 'free' ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-3'}`}>{controls.map(control => <label key={control.label} className="flex flex-col gap-1 text-xs font-semibold text-muted">
            <span>{control.label}</span>
            <input type="range" className="min-h-7 w-full accent-accent" min={control.min} max={control.max} step={shape === 'free' ? 1 : 0.01} disabled={control.max === control.min || ('disabled' in control && control.disabled)} value={control.value} onChange={event => control.change(Number(event.target.value))} />
          </label>)}</div>
        </fieldset>
      </>}
    </div>
    <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-border pt-4"><button type="button" className="btn" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="btn btn-primary" disabled={!rotated || busy} onClick={save}>{busy ? 'Saving photo…' : 'Save photo'}</button></div>
  </DialogContent></Dialog>;
}
