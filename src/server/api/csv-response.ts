import { format } from "date-fns";

export function csvResponse(csv: string, baseName: string) {
  const fileName = `${baseName}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
