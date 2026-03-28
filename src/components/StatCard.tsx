'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export default function StatCard({ label, value, subtitle, icon, className = '' }: StatCardProps) {
  return (
    <div className={`glass rounded-xl p-5 hover:bg-card-hover transition-all group ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold gradient-text">{value}</p>
          {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
