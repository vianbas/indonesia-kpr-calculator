import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'bare';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-sm active:bg-blue-800',
  secondary:
    'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-sm active:bg-gray-100',
  danger:
    'bg-white hover:bg-red-50 text-red-600 border-red-300 active:bg-red-100',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 border-transparent',
  // No color classes — caller supplies all styling via className.
  // Use for toggle-style buttons where active/inactive colors must be fully controlled.
  bare: 'border-transparent',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1',
  md: 'text-sm px-4 py-2 gap-1.5',
  lg: 'text-sm px-5 py-2.5 gap-2',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-lg border font-medium',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
