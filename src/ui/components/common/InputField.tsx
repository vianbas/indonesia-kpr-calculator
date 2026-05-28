import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Tooltip } from './Tooltip';

interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
}

export function InputField({
  label,
  value,
  onChange,
  error,
  hint,
  prefix,
  suffix,
  tooltip,
  id,
  className: _className,
  ...rest
}: InputFieldProps) {
  // useId provides a stable unique ID per instance — fallback when label is empty
  const generatedId = useId();
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 flex items-center">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </label>
      )}

      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-gray-500 pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            'w-full rounded-lg border text-sm py-2.5 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            prefix ? 'pl-10' : 'pl-3',
            suffix ? 'pr-12' : 'pr-3',
            error
              ? 'border-red-400 bg-red-50 text-red-900 placeholder-red-300'
              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
          ].join(' ')}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={!!error}
          {...rest}
        />
        {suffix && (
          <span className="absolute right-3 text-sm text-gray-500 pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
