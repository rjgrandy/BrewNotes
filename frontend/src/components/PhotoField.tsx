import { useRef, useState } from 'react';
import ImageEditor from './ImageEditor';

type Props = {
  label: string;
  /** Current photo to show (full-size url preferred, thumbnail as fallback). */
  photoUrl?: string | null;
  thumbnailUrl?: string | null;
  editorTitle?: string;
  onSave: (blob: Blob) => Promise<void> | void;
};

export default function PhotoField({ label, photoUrl, thumbnailUrl, editorTitle, onSave }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const displayUrl = thumbnailUrl || photoUrl;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError('');
    setPendingFile(file);
  };

  const handleSave = async (blob: Blob) => {
    setPendingFile(null);
    setBusy(true);
    setError('');
    try {
      await onSave(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack photo-field">
      <span className="label">{label}</span>
      <div className="inline" style={{ alignItems: 'center' }}>
        {displayUrl ? (
          <a href={photoUrl || displayUrl} target="_blank" rel="noreferrer">
            <img className="photo-preview" src={displayUrl} alt={label} />
          </a>
        ) : (
          <div className="photo-preview photo-placeholder" aria-hidden="true">
            ☕
          </div>
        )}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : displayUrl ? 'Change Photo' : 'Add Photo'}
        </button>
      </div>
      {error && <span className="label error-text">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {pendingFile && (
        <ImageEditor
          file={pendingFile}
          title={editorTitle || 'Edit Photo'}
          onSave={handleSave}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </div>
  );
}
