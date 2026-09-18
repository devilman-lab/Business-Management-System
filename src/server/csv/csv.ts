/**
 * CSV の読み書き (依存ライブラリなし)。
 * - Excel から保存した CSV (BOM付き UTF-8 / CRLF / ダブルクォート) を扱えるようにする
 * - 出力は Excel で文字化けしないよう BOM 付き UTF-8 とする
 */

export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (ch === "\r" && src[i + 1] === "\n") {
        // セル内の改行は LF に正規化する
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      // CRLF は LF 側で処理
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 完全な空行は除外
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** ヘッダー行をキーにしたオブジェクト配列へ変換 */
export function csvToRecords(text: string): { headers: string[]; records: Record<string, string>[] } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (r[i] ?? "").trim();
    });
    return rec;
  });
  return { headers, records };
}

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  // 数式インジェクション対策: 先頭が = + - @ の場合はシングルクォートを付与
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  if (/[",\r\n]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`;
  return guarded;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const r of rows) lines.push(r.map(escapeCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
