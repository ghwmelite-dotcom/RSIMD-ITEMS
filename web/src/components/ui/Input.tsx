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
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green disabled:bg-gray-50 disabled:text-gray-500 ${error ? "border-ghana-red" : ""} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-ghana-red">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
