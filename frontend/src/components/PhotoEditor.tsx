import { useEffect, useMemo, useRef, useState } from 'react';
import { Crop as CropIcon, RotateCcw, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/Dialog';
import { cropBounds, exportCrop, rotateImage } from '../utils/photo';

export default function PhotoEditor({ source, onCancel, onSave }: { source: File | string; onCancel: () => void; onSave: (file: File) => Promise<void> }) {
  const [image, setImage] = useState<HTMLImageElement>();
  const [turns, setTurns] = useState(0);
  const [shape, setShape] = useState('original');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const preview = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number }>();
  useEffect(() => {
    let active = true;
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const photo = new Image();
    photo.onload = () => { if (active) setImage(photo); };
    photo.onerror = () => { if (active) setError('This photo could not be opened. Try a JPEG, PNG, or WebP image.'); };
    photo.src = url;
    return () => { active = false; if (typeof source !== 'string') URL.revokeObjectURL(url); };
  }, [source]);
  const rotated = useMemo(() => image ? rotateImage(image, turns) : undefined, [image, turns]);
  const aspect = shape === 'original' ? (rotated ? rotated.width / rotated.height : 1) : Number(shape);
  const crop = rotated ? cropBounds(rotated.width, rotated.height, aspect, zoom, position.x, position.y) : undefined;
  useEffect(() => {
    const canvas = preview.current;
    if (!canvas || !rotated || !crop) return;
    canvas.width = Math.round(900 * Math.min(1, aspect));
    canvas.height = Math.round(canvas.width / aspect);
    canvas.getContext('2d')?.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  }, [rotated, aspect, zoom, position.x, position.y]);
  const resetPosition = () => { setZoom(1); setPosition({ x: 0.5, y: 0.5 }); };
  const save = async () => {
    if (!rotated || !crop || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onSave(await exportCrop(rotated, crop)); onCancel(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Upload failed. Your edit is still here; try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onCancel(); }}><DialogContent wide className="!flex !flex-col !overflow-hidden">
    <DialogTitle className="flex shrink-0 items-center gap-2 text-xl font-bold"><CropIcon size={21} /> Make it picture perfect</DialogTitle>
    <DialogDescription className="mt-1 shrink-0 text-sm text-muted">Choose a crop, rotate, and drag to frame your photo.</DialogDescription>
    <div className="min-h-0 overflow-y-auto pr-1">
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    {!image && !error && <p role="status" className="py-10 text-center text-muted">Opening photo…</p>}
    {image && <>
      <div className="photo-stage mt-4">
        <canvas ref={preview} aria-label="Cropped photo preview" style={{ aspectRatio: aspect }}
          onPointerDown={e => { if (busy) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }; }}
          onPointerMove={e => {
            if (!drag.current || !crop || !rotated) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clamp = (n: number) => Math.min(1, Math.max(0, n));
            setPosition({ x: clamp(drag.current.px - (e.clientX - drag.current.x) / rect.width * crop.width / Math.max(1, rotated.width - crop.width)), y: clamp(drag.current.py - (e.clientY - drag.current.y) / rect.height * crop.height / Math.max(1, rotated.height - crop.height)) });
          }} onPointerUp={() => { drag.current = undefined; }} onPointerCancel={() => { drag.current = undefined; }} />
      </div>
      <fieldset disabled={busy} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="mr-auto flex flex-col gap-1"><span className="field-label">Crop shape</span><select className="input" value={shape} onChange={e => { setShape(e.target.value); resetPosition(); }}><option value="original">Original</option><option value="1">Square</option><option value="1.3333333333333333">Landscape 4:3</option><option value="0.75">Portrait 3:4</option><option value="1.7777777777777777">Wide 16:9</option></select></label>
          <button className="btn" aria-label="Rotate left" onClick={() => { setTurns(t => (t + 3) % 4); resetPosition(); }}><RotateCcw size={18} /></button>
          <button className="btn" aria-label="Rotate right" onClick={() => { setTurns(t => (t + 1) % 4); resetPosition(); }}><RotateCw size={18} /></button>
          <button className="btn" onClick={() => { setTurns(0); setShape('original'); resetPosition(); }}>Reset</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">{[
          { label: `Zoom · ${zoom.toFixed(1)}×`, value: zoom, min: 1, max: 4, change: setZoom, disabled: false },
          { label: 'Horizontal position', value: position.x, min: 0, max: 1, change: (x: number) => setPosition(p => ({ ...p, x })), disabled: !!crop && !!rotated && rotated.width - crop.width < 1 },
          { label: 'Vertical position', value: position.y, min: 0, max: 1, change: (y: number) => setPosition(p => ({ ...p, y })), disabled: !!crop && !!rotated && rotated.height - crop.height < 1 }
        ].map(control => <label key={control.label.split(' · ')[0]} className="flex flex-col gap-2 text-xs font-semibold text-muted">{control.label}<input type="range" className="min-h-8 w-full accent-accent" min={control.min} max={control.max} step="0.01" disabled={control.disabled} value={control.value} onChange={e => control.change(Number(e.target.value))} /></label>)}</div>
      </fieldset>
    </>}
    </div>
    <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-border pt-4"><button className="btn" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={!image || busy} onClick={save}>{busy ? 'Saving photo…' : 'Save photo'}</button></div>
  </DialogContent></Dialog>;
}
