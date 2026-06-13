import { ReactNode } from 'react';

type Stat = { label: string; value: string };

type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
  stats?: Stat[];
  action?: ReactNode;
};

export default function Hero({ kicker, title, subtitle, stats, action }: Props) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl p-6 text-white sm:p-8"
      style={{
        background: 'linear-gradient(135deg, var(--accent-strong) 0%, var(--accent) 55%, var(--gold) 130%)',
        boxShadow: 'var(--shadow-pop)'
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/coffee-beans-header-photo.svg')] bg-cover bg-center opacity-25 mix-blend-overlay"
      />
      <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
      <div aria-hidden className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-black/10 blur-3xl" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {kicker && (
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">{kicker}</span>
            )}
            <h1 className="mt-1 text-3xl font-bold tracking-tight drop-shadow-sm sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-xl text-sm text-white/85 sm:text-base">{subtitle}</p>}
          </div>
          {action}
        </div>

        {stats && stats.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm"
              >
                <div className="text-lg font-bold leading-none">{stat.value}</div>
                <div className="mt-1 text-[0.7rem] uppercase tracking-wide text-white/75">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
