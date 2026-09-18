import { cn } from "@/lib/utils";

/* 一覧テーブル。横幅が足りない場合は横スクロールで対応 (PC業務利用を最優先) */

export function TableWrapper({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("w-full overflow-x-auto", className)}>{children}</div>;
}

/**
 * layout="scroll": 列幅を内容に合わせ、足りない場合は横スクロール (一覧画面向け)
 * layout="auto"  : 親幅に収め、セル内で折り返す (詳細画面の埋め込みテーブル向け)
 */
export function Table({ className, children, layout = "scroll" }: { className?: string; children: React.ReactNode; layout?: "scroll" | "auto" }) {
  return <table className={cn("w-full border-collapse text-sm", layout === "scroll" && "min-w-max", className)}>{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Tr({ className, children, ...rest }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors hover:bg-slate-50/80", className)} {...rest}>
      {children}
    </tr>
  );
}

export function Th({ className, children, align, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, align, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn("px-3 py-2.5 align-middle text-slate-700", align === "right" && "text-right", align === "center" && "text-center", className)}
      {...rest}
    >
      {children}
    </td>
  );
}
