/**
 * アプリケーション共通のエラー型。
 * サービス層はこれらを throw し、API 層が HTTP ステータスへ変換する。
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code: string = "BAD_REQUEST",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "対象のデータが見つかりません") {
    super(message, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "ログインが必要です") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "この操作を行う権限がありません") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "入力内容に誤りがあります",
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message, 422, "VALIDATION_ERROR", fieldErrors);
  }
}

export class ConflictError extends AppError {
  constructor(message = "既に登録されています") {
    super(message, 409, "CONFLICT");
  }
}
