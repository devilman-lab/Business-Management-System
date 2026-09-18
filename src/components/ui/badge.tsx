import { cn } from "@/lib/utils";
import type { BadgeTone, OptionDef } from "@/lib/constants";

const tones: Record<BadgeTone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  slate: "bg-slate-200 text-slate-700 ring-slate-300",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

const dots: Record<BadgeTone, string> = {
  gray: "bg-slate-400",
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  purple: "bg-violet-500",
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function Badge({ tone = "gray", children, dot, className, size = "md" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium ring-1 ring-inset",
        size === "sm" ? "px-1.5 py-px text-[11px]" : "px-2 py-0.5 text-xs",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden />}
      {children}
    </span>
  );
}

/** 列挙値の定義 (ラベル + 色) からバッジを描画 */
export function OptionBadge<T extends string>({ option, dot = true, size }: { option: OptionDef<T>; dot?: boolean; size?: "sm" | "md" }) {
  return (
    <Badge tone={option.tone} dot={dot} size={size}>
      {option.label}
    </Badge>
  );
}
