/**
 * デモ用の最小限の PDF を生成する (外部ライブラリ不要)。
 * 実際のファイル添付・ダウンロードの動作確認用。
 */
export function makeMinimalPdf(lines: string[]): Buffer {
  const safe = lines.map((l) => l.replace(/[^\x20-\x7E]/g, "?").replace(/[()\\]/g, "\\$&"));
  const content = [
    "BT",
    "/F1 16 Tf",
    "50 780 Td",
    "18 TL",
    ...safe.map((l, i) => (i === 0 ? `(${l}) Tj` : `T* (${l}) Tj`)),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "binary");
}
