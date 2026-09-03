import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export function FieldWrapper({ label, error, hint, required, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const baseFieldStyles =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-800/30 disabled:bg-slate-50 disabled:text-slate-400";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, required, id, className, ...props }, ref) => {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        required={required}
        className={clsx(baseFieldStyles, error ? "border-red-400" : "border-slate-300", className)}
        {...props}
      />
    </FieldWrapper>
  );
});
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, id, className, ...props }, ref) => {
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required} htmlFor={id}>
        <textarea
          ref={ref}
          id={id}
          required={required}
          className={clsx(baseFieldStyles, "min-h-[80px] resize-y", error ? "border-red-400" : "border-slate-300", className)}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, id, className, children, ...props }, ref) => {
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required} htmlFor={id}>
        <select
          ref={ref}
          id={id}
          required={required}
          className={clsx(baseFieldStyles, "cursor-pointer", error ? "border-red-400" : "border-slate-300", className)}
          {...props}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  }
);
Select.displayName = "Select";
