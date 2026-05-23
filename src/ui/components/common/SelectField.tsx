import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string = string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  error?: string;
  hint?: string;
}

export function SelectField<T extends string = string>({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  id,
  ...rest
}: SelectFieldProps<T>) {
  const generatedId = useId();
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        // The cast is safe: the only values reachable here are the option values, all of type T
        onChange={(e) => onChange(e.target.value as T)}
        className={[
          'w-full rounded-lg border text-sm py-2.5 px-3 transition-colors bg-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error
            ? 'border-red-400 text-red-900 bg-red-50'
            : 'border-gray-300 text-gray-900',
        ].join(' ')}
        aria-invalid={!!error}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600"><span aria-hidden="true">⚠</span> {error}</p>}
      {!error && hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
