import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`block w-full rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 shadow-warm-sm placeholder:text-surface-400 dark:placeholder:text-surface-600 focus:border-ghana-gold/50 focus:outline-none focus:ring-1 focus:ring-ghana-gold/30 disabled:bg-surface-50 dark:disabled:bg-surface-800 disabled:text-surface-500 dark:disabled:text-surface-400 ${error ? "border-ghana-red" : ""} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-ghana-red">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
