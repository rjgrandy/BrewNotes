import { ReactNode, useState } from 'react';
import { cn } from './ui/cn';

export function BeanArtwork() {
  return <svg viewBox="0 0 160 180" fill="none" aria-hidden="true" className="bean-artwork">
    <path d="M25 146h110M34 32h92M28 26v126M132 26v126" stroke="currentColor" opacity=".18" strokeDasharray="3 5" />
    <ellipse cx="80" cy="148" rx="40" ry="6" fill="currentColor" opacity=".08" />
    <path d="M54 34h52l-3 15 13 87q-36 13-72 0l13-87Z" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
    <path d="M54 34h52M57 42h46M57 49h46M44 136l15-10h43l14 10M57 49l2 77" stroke="currentColor" opacity=".4" />
    <path d="M62 64h36v48H62z" fill="var(--accent-soft)" />
    <ellipse cx="80" cy="82" rx="7" ry="10" transform="rotate(30 80 82)" fill="var(--accent)" />
    <path d="M83 74q-7 7-6 16" stroke="var(--surface)" strokeWidth="1.4" />
    <path d="M70 100h20M75 105h10" stroke="var(--accent)" opacity=".6" />
  </svg>;
}

type Props = {
  src?: string; fallbackSrc?: string; alt: string; className?: string;
  placeholder?: ReactNode; loading?: 'lazy' | 'eager';
};

// Key the image state to its URLs so replacing an image also resets failed loads.
export default function PhotoFrame(props: Props) {
  return <FrameImage key={`${props.src ?? ''}|${props.fallbackSrc ?? ''}`} {...props} />;
}

function FrameImage({ src, fallbackSrc, alt, className, placeholder, loading = 'lazy' }: Props) {
  const [failed, setFailed] = useState<string[]>([]);
  const current = [src, fallbackSrc].find(url => url && !failed.includes(url));
  return <div className={cn('photo-frame', className)}>
    {current ? <img src={current} alt={alt} loading={loading} decoding="async"
      onError={() => setFailed(previous => [...previous, current])} />
      : <div className="photo-placeholder" role={alt ? 'img' : undefined} aria-label={alt ? `${alt} — no photo available` : undefined}>
        {placeholder ?? <BeanArtwork />}
      </div>}
  </div>;
}
