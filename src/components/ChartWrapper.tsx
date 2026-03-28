'use client';

import { ReactNode } from 'react';

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function ChartWrapper({ title, subtitle, children, className = '' }: ChartWrapperProps) {
  return (
    <div className={`glass rounded-xl p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
