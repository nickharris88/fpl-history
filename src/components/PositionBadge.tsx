'use client';

const POSITION_COLORS: Record<string, string> = {
  GKP: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DEF: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MID: 'bg-green-500/20 text-green-400 border-green-500/30',
  FWD: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function PositionBadge({ position }: { position: string }) {
  const colorClass = POSITION_COLORS[position] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
      {position}
    </span>
  );
}
