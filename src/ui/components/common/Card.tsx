import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** Renders a colored left border accent: 'blue' | 'indigo' | 'green' */
  accent?: 'blue' | 'indigo' | 'green' | 'none';
}

const accentClasses = {
  blue: 'border-l-4 border-l-blue-500',
  indigo: 'border-l-4 border-l-indigo-500',
  green: 'border-l-4 border-l-green-500',
  none: '',
};

export function Card({ title, subtitle, children, className = '', accent = 'none' }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl shadow-sm border border-gray-200',
        accentClasses[accent],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || subtitle) && (
        <div className="px-5 pt-5 pb-3">
          {title && <h2 className="text-sm font-semibold text-gray-800 tracking-wide uppercase">{title}</h2>}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className={title || subtitle ? 'px-5 pb-5' : 'p-5'}>{children}</div>
    </div>
  );
}
