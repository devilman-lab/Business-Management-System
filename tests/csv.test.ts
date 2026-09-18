import { describe, expect, it } from "vitest";
import { csvToRecords, parseCsv, toCsv } from "@/server/csv/csv";

describe("CSV パース", () => {
  it("BOM・CRLF・クォート・改行入りセルを扱える", () => {
    const text = '﻿顧客名,備考\r\n"株式会社 ""サンプル""","複数行\r\nメモ, カンマ含む"\r\n会社B,\r\n';
    const rows = parseCsv(text);
    expect(rows).toEqual([
      ["顧客名", "備考"],
      ['株式会社 "サンプル"', "複数行\nメモ, カンマ含む"],
      ["会社B", ""],
    ]);
  });

  it("空行は無視し、ヘッダーをキーにしたレコードへ変換する", () => {
    const { headers, records } = csvToRecords("a,b\n1,2\n\n3,4\n");
    expect(headers).toEqual(["a", "b"]);
    expect(records).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("末尾改行なし・列不足でも壊れない", () => {
    const { records } = csvToRecords("a,b,c\n1,2");
    expect(records).toEqual([{ a: "1", b: "2", c: "" }]);
  });
});

describe("CSV 出力", () => {
  it("BOM 付き・必要なセルのみクォート・数式インジェクション対策", () => {
    const out = toCsv(["名前", "メモ"], [["A社", "カンマ,あり"], ["=SUM(1)", "改行\nあり"], ["B社", null]]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    const lines = out.slice(1).split("\r\n");
    expect(lines[0]).toBe("名前,メモ");
    expect(lines[1]).toBe('A社,"カンマ,あり"');
    expect(lines[2]).toBe("'=SUM(1),\"改行\nあり\"");
    expect(lines[3]).toBe("B社,");
  });

  it("出力したCSVを再度読み込むと同じ値になる (往復)", () => {
    const rows = [["株式会社 \"テスト\"", "a,b", "1\n2"]];
    const parsed = parseCsv(toCsv(["x", "y", "z"], rows));
    expect(parsed[1]).toEqual(rows[0]);
  });
});
