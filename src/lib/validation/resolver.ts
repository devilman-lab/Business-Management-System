import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * react-hook-form 用リゾルバ。
 * スキーマは z.preprocess で「空文字 → null」等の変換を行うため入力型が unknown になる。
 * フォーム側の値型 (すべて string) と API 入力型を明示して型を合わせる。
 */
export function formResolver<TValues extends FieldValues, TOutput>(schema: ZodType): Resolver<TValues, unknown, TOutput> {
  return zodResolver(schema as never) as unknown as Resolver<TValues, unknown, TOutput>;
}
