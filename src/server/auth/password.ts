import bcrypt from "bcryptjs";

/**
 * パスワードは平文で保存せず bcrypt でハッシュ化する。
 * コスト係数はデモ用に 10。本番では 12 程度を推奨。
 */
const COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
