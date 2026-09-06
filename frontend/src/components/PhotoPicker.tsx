import { useRef, useState } from 'react';
import { Camera, ImagePlus, Crop } from 'lucide-react';
import PhotoEditor from './PhotoEditor';
import { useToast } from './ui/Toast';

export default function PhotoPicker({ onSave, currentPhoto, editOnly = false }: { onSave: (file: File) => Promise<void>; currentPhoto?: string; editOnly?: boolean }) {
  const [source, setSource] = useState<File | string>();
  const library = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const select = (input: HTMLInputElement) => {
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast('Choose a photo smaller than 25 MB.', 'error'); return; }
    setSource(file);
  };
  return <>
    <div className="flex flex-wrap gap-2">
      {!editOnly && <><button type="button" className="btn" onClick={() => library.current?.click()}><ImagePlus size={16} />{currentPhoto ? 'Replace photo' : 'Add photo'}</button><button type="button" className="btn" onClick={() => camera.current?.click()}><Camera size={16} /> Camera</button></>}
      {currentPhoto && <button type="button" className="btn" onClick={() => setSource(currentPhoto)}><Crop size={16} /> Edit photo</button>}
    </div>
    <input ref={library} type="file" accept="image/*" className="hidden" aria-label="Choose photo" onChange={e => select(e.target)} />
    <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Take photo" onChange={e => select(e.target)} />
    {source && <PhotoEditor source={source} onCancel={() => setSource(undefined)} onSave={onSave} />}
  </>;
}
