'use client';

const SEASONS = [
  '2016-17', '2017-18', '2018-19', '2019-20', '2020-21',
  '2021-22', '2022-23', '2023-24', '2024-25'
];

interface SeasonSelectorProps {
  value: string;
  onChange: (season: string) => void;
  className?: string;
}

export default function SeasonSelector({ value, onChange, className = '' }: SeasonSelectorProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {SEASONS.map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${
            value === s
              ? 'bg-accent/15 text-accent border-accent/30'
              : 'bg-card border-border text-muted hover:text-foreground hover:border-accent/20'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
