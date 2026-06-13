import { useId } from 'react';

// Stylized, representative cup graphics per drink type — proportions of
// espresso / milk / foam and vessel shape differ so each type reads distinctly.
const COFFEE = '#5b3a24';
const CREMA = '#b06d40';
const MILK = '#efe0cd';
const FOAM = '#fbf3e8';
const CERAMIC = '#fdfaf6';
const STROKE = '#8a6b52';

type Shape = 'cup' | 'mug' | 'glass';
type Band = [string, number]; // [color, fraction of vessel height, bottom -> top]
type Conf = { shape: Shape; w: number; h: number; bands: Band[] };

const CONF: Record<string, Conf> = {
  Espresso: { shape: 'cup', w: 16, h: 13, bands: [[COFFEE, 0.78], [CREMA, 0.22]] },
  Macchiato: { shape: 'cup', w: 16, h: 13, bands: [[COFFEE, 0.66], [FOAM, 0.34]] },
  Cortado: { shape: 'glass', w: 15, h: 17, bands: [[COFFEE, 0.5], [MILK, 0.5]] },
  'Flat White': { shape: 'cup', w: 21, h: 15, bands: [[COFFEE, 0.45], [MILK, 0.5], [FOAM, 0.05]] },
  Cappuccino: { shape: 'cup', w: 21, h: 17, bands: [[COFFEE, 0.35], [MILK, 0.2], [FOAM, 0.45]] },
  Latte: { shape: 'glass', w: 16, h: 30, bands: [[COFFEE, 0.3], [MILK, 0.6], [FOAM, 0.1]] },
  Americano: { shape: 'mug', w: 18, h: 24, bands: [[COFFEE, 0.9], [CREMA, 0.1]] },
  Coffee: { shape: 'mug', w: 20, h: 25, bands: [[COFFEE, 1]] }
};

const DEFAULT: Conf = { shape: 'cup', w: 18, h: 16, bands: [[COFFEE, 0.85], [CREMA, 0.15]] };

export default function DrinkGlyph({ type, className }: { type: string; className?: string }) {
  const clipId = useId();
  const conf = CONF[type] ?? DEFAULT;
  const cx = 21;
  const yB = 40;
  const x = cx - conf.w / 2;
  const yT = yB - conf.h;
  const rx = conf.shape === 'glass' ? 2 : 3;

  // Stack liquid bands from the bottom up.
  let cursor = yB;
  const bandRects = conf.bands.map(([color, frac], i) => {
    const bh = frac * conf.h;
    cursor -= bh;
    return <rect key={i} x={x} y={cursor} width={conf.w} height={bh} fill={color} />;
  });

  const xR = x + conf.w;
  const hasHandle = conf.shape === 'cup' || conf.shape === 'mug';
  const isSmallCup = conf.shape === 'cup' && conf.h <= 13;

  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={type}>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={yT} width={conf.w} height={conf.h} rx={rx} />
        </clipPath>
      </defs>

      {/* steam */}
      <g stroke={STROKE} strokeWidth={1.5} fill="none" opacity={0.45} strokeLinecap="round">
        <path d={`M ${cx - 3},${yT - 3} q -2.5,-3 0,-6`} />
        <path d={`M ${cx + 3},${yT - 3} q 2.5,-3 0,-6`} />
      </g>

      {/* saucer for small cups */}
      {isSmallCup && <ellipse cx={cx} cy={yB + 3} rx={conf.w * 0.85} ry={1.8} fill="none" stroke={STROKE} strokeWidth={2} />}

      {/* vessel + liquid */}
      <rect x={x} y={yT} width={conf.w} height={conf.h} rx={rx} fill={CERAMIC} stroke={STROKE} strokeWidth={2} />
      <g clipPath={`url(#${clipId})`}>{bandRects}</g>
      <rect x={x} y={yT} width={conf.w} height={conf.h} rx={rx} fill="none" stroke={STROKE} strokeWidth={2} />

      {/* handle */}
      {hasHandle && (
        <path
          d={`M ${xR - 1},${yT + conf.h * 0.28} c 7,0 7,${conf.h * 0.42} 0,${conf.h * 0.42}`}
          fill="none"
          stroke={STROKE}
          strokeWidth={2.4}
        />
      )}
    </svg>
  );
}
