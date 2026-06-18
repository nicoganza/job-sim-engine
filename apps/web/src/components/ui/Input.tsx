'use client';
import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  hint?: string;
  prefix?: ReactNode;
  textarea?: boolean;
  rows?: number;
}

const base =
  'w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-[14px] text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-brand transition bg-white';

export function Input({ label, hint, prefix, textarea, rows = 4, className = '', type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[14px] font-semibold text-ink-700">{label}</label>}
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
            {prefix}
          </div>
        )}
        {textarea ? (
          <textarea
            rows={rows}
            className={`${base} resize-none ${prefix ? 'pl-10' : ''} ${className}`}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            type={resolvedType}
            className={`${base} ${prefix ? 'pl-10' : ''} ${isPassword ? 'pr-10' : ''} ${className}`}
            {...props}
          />
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[12px] text-ink-400">{hint}</p>}
    </div>
  );
}
