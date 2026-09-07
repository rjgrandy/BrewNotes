import { useId } from 'react';

type Vessel = { width: number; height: number; glass?: boolean; mug?: boolean; milk: number; foam: number };
const vessels: Record<string, Vessel> = {
  Espresso: { width: 68, height: 48, milk: 0, foam: 0 },
  Macchiato: { width: 68, height: 48, milk: 0, foam: .3 },
  Cortado: { width: 66, height: 70, glass: true, milk: .5, foam: .05 },
  'Flat White': { width: 91, height: 59, milk: .75, foam: .1 },
  Cappuccino: { width: 94, height: 68, milk: .5, foam: .7 },
  Latte: { width: 70, height: 110, glass: true, milk: .75, foam: .2 },
  Americano: { width: 74, height: 85, mug: true, milk: 0, foam: 0 },
  Coffee: { width: 83, height: 92, mug: true, milk: 0, foam: 0 }
};

// Locally rendered studio illustrations. Construction marks are decorative,
// with no quantities that could be confused with a saved brewing recipe.
export default function DrinkGlyph({ type, className, technical = false }: { type: string; className?: string; technical?: boolean }) {
  const id = useId().replace(/:/g, '');
  const v = vessels[type] ?? vessels.Espresso;
  const x = 94 - v.width / 2, right = x + v.width, bottom = 153, top = bottom - v.height;
  const inset = v.glass ? 8 : v.mug ? 5 : 16;
  const body = `M${x},${top} Q94,${top + 14} ${right},${top} L${right - inset},${bottom - 12} Q94,${bottom + 8} ${x + inset},${bottom - 12}Z`;
  const ref = (name: string) => `url(#${id}-${name})`;
  const surface = v.milk > 0 ? '#b88250' : type === 'Coffee' ? '#321e17' : '#653a22';
  return <svg viewBox="0 0 200 200" className={className} role="img" aria-label={type}>
    <defs>
      <linearGradient id={`${id}-ceramic`} x1="0" x2="1" y1=".2" y2=".5"><stop stopColor="#a29a8c" /><stop offset=".18" stopColor="#f8f4e9" /><stop offset=".48" stopColor="#fffdf5" /><stop offset=".8" stopColor="#dcd5c8" /><stop offset="1" stopColor="#aaa394" /></linearGradient>
      <linearGradient id={`${id}-glass`}><stop stopColor="#a8c4c3" stopOpacity=".5" /><stop offset=".17" stopColor="#ffffff" stopOpacity=".7" /><stop offset=".45" stopColor="#eaf4f1" stopOpacity=".12" /><stop offset=".86" stopColor="#d4e6de" stopOpacity=".3" /><stop offset="1" stopColor="#819b9b" stopOpacity=".7" /></linearGradient>
      <linearGradient id={`${id}-coffee`} x2=".9" y2="1"><stop stopColor="#9f6034" /><stop offset=".6" stopColor="#58311f" /><stop offset="1" stopColor="#2c1b15" /></linearGradient>
      <linearGradient id={`${id}-milk`} x2=".8" y2="1"><stop stopColor="#fff5df" /><stop offset=".5" stopColor="#e0ba8f" /><stop offset="1" stopColor="#a7744e" /></linearGradient>
      <radialGradient id={`${id}-surface`} cx=".4" cy=".3"><stop stopColor={v.milk ? '#d9a36a' : '#b57841'} /><stop offset="1" stopColor={surface} /></radialGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#211d19" stopOpacity=".25" /><stop offset="1" stopColor="#211d19" stopOpacity="0" /></radialGradient>
      <clipPath id={`${id}-body`}><path d={body} /></clipPath>
    </defs>
    {technical && <g fill="none" stroke="var(--accent)" strokeWidth=".7" opacity=".38" aria-hidden="true">
      <circle cx="94" cy="104" r="76" strokeDasharray="2 6" />
      <path d="M94 16v159M16 153h164M26 42h18M35 33v18M160 161v14M153 168h14" strokeDasharray="3 4" />
      <path d={`M${right + 24} ${top}h11m-5 0v${v.height}m-6 0h11M${x} 180v-8m0 4h${v.width}m0-4v8`} />
      {[.25, .5, .75].map(p => <path key={p} d={`M${right + 27} ${top + v.height * p}h6`} />)}
    </g>}
    <ellipse cx="97" cy="168" rx="66" ry="15" fill={ref('shadow')} />
    {!v.glass && !v.mug && <><ellipse cx="94" cy="159" rx="57" ry="11" fill={ref('ceramic')} /><ellipse cx="94" cy="157" rx="47" ry="7" fill="none" stroke="#b9ae9d" strokeWidth=".8" /></>}
    {!v.glass && <><path d={`M${right - 3} ${top + 15} C${right + 37} ${top + 4},${right + 33} ${bottom - 5},${right - 9} ${bottom - 16}`} fill="none" stroke="#b1a898" strokeWidth="12" /><path d={`M${right - 2} ${top + 13} C${right + 33} ${top + 5},${right + 29} ${bottom - 8},${right - 9} ${bottom - 18}`} fill="none" stroke="#eee8dc" strokeWidth="7" /></>}
    <path d={body} fill={v.glass ? ref('coffee') : ref('ceramic')} stroke={v.glass ? '#929e96' : '#b2a99a'} strokeWidth=".8" />
    {v.glass && <g clipPath={ref('body')}>
      <path d={`M${x} ${top}h${v.width}v${v.height * v.milk}Q94 ${top + v.height * v.milk + 9} ${x} ${top + v.height * v.milk}Z`} fill={ref('milk')} />
      <path d={body} fill={ref('glass')} />
      <path d={`M${x + 7} ${top + 8}l6 ${v.height - 23}M${right - 7} ${top + 10}l-5 ${v.height - 27}`} stroke="#fffdf0" strokeWidth="3" opacity=".6" />
      <path d={`M${x + 12} ${bottom - 10}Q94 ${bottom - 1} ${right - 12} ${bottom - 10}`} stroke="#eee9d8" strokeWidth="3" opacity=".75" />
    </g>}
    <ellipse cx="94" cy={top} rx={v.width / 2} ry="11" fill={v.glass ? '#d8d8c7' : '#f5efe2'} stroke="#b4a796" strokeWidth=".8" />
    <ellipse cx="94" cy={top} rx={v.width / 2 - 4} ry="8.5" fill={ref('surface')} />
    <ellipse cx="94" cy={top} rx={v.width / 2 - 6} ry="7" fill="none" stroke="#d6a567" strokeWidth="1.3" opacity=".6" />
    {v.foam > 0 && <g transform={`translate(94 ${top}) scale(${v.width / 94} .42)`} fill="#fcf2dc">
      {type === 'Macchiato' ? <ellipse rx="12" ry="11" /> : <>
        <path d="M0 15C-36-2-21-24-3-12C7-27 30-10 13 4Z" opacity=".95" />
        <path d="M-1 11C-26-2-18-16-5-8C6-20 22-8 9 2Z" fill="#c5935c" />
        <path d="M0 8C-18-1-12-11-3-5C6-13 15-5 6 2Z" />
        <path d="M0 19L4-15" stroke="#fff6e6" strokeWidth="2" />
      </>}
    </g>}
    {[0, 1, 2, 3, 4].map(n => <ellipse key={n} cx={x + 12 + n * 5} cy={top + Math.sin(n * 2) * 3} rx=".7" ry=".45" fill="#f4d3a0" opacity=".6" />)}
    {!v.glass && <path d={`M${x + 8} ${top + 17}Q${x + 9} ${bottom - 19} ${x + inset + 10} ${bottom - 12}`} fill="none" stroke="#ffffff" strokeWidth="2" opacity=".6" />}
    <g fill="none" stroke="var(--muted)" strokeWidth="1.1" opacity=".25" strokeLinecap="round"><path d={`M86 ${top - 19}c-9-11 7-14 0-25M101 ${top - 22}c9-10-5-15 1-23`} /></g>
  </svg>;
}
