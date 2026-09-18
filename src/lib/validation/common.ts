import { z } from "zod";

/** 空文字を null に変換する (フォーム入力の未入力を DB の NULL に揃える) */
export const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

/** 任意のテキスト項目 */
export const optionalText = (max = 255) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, `${max}文字以内で入力してください`).nullable().optional(),
  );

/** 必須のテキスト項目 */
export const requiredText = (label: string, max = 255) =>
  z
    .string({ error: `${label}は必須です` })
    .trim()
    .min(1, `${label}は必須です`)
    .max(max, `${label}は${max}文字以内で入力してください`);

/**
 * 日付項目。"yyyy-MM-dd" はローカル日付として解釈する
 * (UTC 変換によって日付が1日ずれることを防ぐ)
 */
const parseDateInput = (v: unknown): unknown => {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s : d;
  }
  return v;
};

export const optionalDate = z.preprocess(
  parseDateInput,
  z.date({ error: "日付の形式が正しくありません" }).nullable().optional(),
);

export const requiredDate = (label: string) =>
  z.preprocess(parseDateInput, z.date({ error: `${label}の形式が正しくありません` }));

export const optionalDateTime = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.coerce.date({ error: "日時の形式が正しくありません" }).nullable().optional(),
);

export const optionalEmail = z.preprocess(
  emptyToNull,
  z.email({ error: "メールアドレスの形式が正しくありません" }).max(255).nullable().optional(),
);

export const optionalPhone = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{6,20}$/, "電話番号の形式が正しくありません")
    .nullable()
    .optional(),
);

/** ID 参照 (未選択は null) */
export const optionalId = z.preprocess(emptyToNull, z.string().max(64).nullable().optional());

export const requiredId = (label: string) =>
  z.string({ error: `${label}を選択してください` }).min(1, `${label}を選択してください`);

/** 一覧共通のクエリ */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** カンマ区切り or 配列 → 配列 */
export const multiValue = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return undefined;
      if (Array.isArray(v)) return v;
      if (typeof v === "string") return v.split(",").filter(Boolean);
      return v;
    },
    z.array(z.enum(values)).optional(),
  );

export const booleanFlag = z.preprocess(
  (v) => v === true || v === "true" || v === "1" || v === "on",
  z.boolean(),
);
