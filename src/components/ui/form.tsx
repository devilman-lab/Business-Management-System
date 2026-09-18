"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ---------- フォーム部品 (統一された見た目・エラー表示) ---------- */

const baseField =
  "w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors " +
  "disabled:bg-slate-50 disabled:text-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus-visible:outline-none";
const okBorder = "border-slate-300";
const errBorder = "border-red-400 focus:border-red-500 focus:ring-red-100";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={cn(baseField, "h-9.5", invalid ? errBorder : okBorder, className)} {...rest} />;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(baseField, "py-2", invalid ? errBorder : okBorder, className)} {...rest} />;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(baseField, "h-9.5 pr-8", invalid ? errBorder : okBorder, className)} {...rest}>
      {children}
    </select>
  );
});

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}
export function FormField({ label, htmlFor, required, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="rounded bg-red-50 px-1 py-px text-[10px] font-semibold text-red-600 ring-1 ring-red-100">必須</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {message}
    </div>
  );
}

export function Checkbox({ className, label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700", className)}>
      <input type="checkbox" className="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" {...rest} />
      {label}
    </label>
  );
}
