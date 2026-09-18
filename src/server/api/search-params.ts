import type { ZodType, z } from "zod";
import { parseWith } from "./handler";

type SearchParams = Record<string, string | string[] | undefined>;

/** ページの searchParams を zod スキーマで検証する。不正な値は無視して既定値で表示する */
export function parseSearchParams<T extends ZodType>(sp: SearchParams, schema: T): z.infer<T> {
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    const s = Array.isArray(v) ? v.join(",") : v;
    if (s !== "") raw[k] = s;
  }
  try {
    return parseWith(schema, raw);
  } catch {
    return parseWith(schema, {});
  }
}
