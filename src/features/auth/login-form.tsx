"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, ShieldCheck, User } from "lucide-react";
import type { Role } from "@prisma/client";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";
import { api, ApiError } from "@/lib/api-client";
import { ROLE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormError, FormField, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
}

const DEMO_PASSWORD = "password123";

export function LoginForm({ demoUsers, next, currentUserName }: { demoUsers: DemoUser[]; next: string; currentUserName: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = async (input: LoginInput) => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/auth/login", input);
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "ログインに失敗しました");
      setSubmitting(false);
    }
  };

  const quickLogin = (u: DemoUser) => {
    setValue("email", u.email);
    setValue("password", DEMO_PASSWORD);
    void submit({ email: u.email, password: DEMO_PASSWORD });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader title="ログイン" description={currentUserName ? `現在 ${currentUserName} でログイン中です。別のユーザーに切り替えます。` : "メールアドレスとパスワードを入力してください"} />
        <CardBody>
          <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
            <FormError message={error} />
            <FormField label="メールアドレス" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="username" placeholder="admin@example.com" invalid={!!errors.email} {...register("email")} />
            </FormField>
            <FormField label="パスワード" htmlFor="password" required error={errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
            </FormField>
            <Button type="submit" className="w-full" loading={submitting} icon={<LogIn className="size-4" />}>
              ログイン
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader
          title="デモアカウントで試す"
          description={
            <>
              クリックするとそのユーザーでログインします (共通パスワード: <code className="rounded bg-slate-100 px-1">{DEMO_PASSWORD}</code>)。
              管理者と一般ユーザーで表示されるメニュー・操作できる範囲が変わります。
            </>
          }
        />
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            {demoUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={submitting}
                onClick={() => quickLogin(u)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50",
                )}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", u.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600")}>
                  {u.role === "ADMIN" ? <ShieldCheck className="size-4.5" /> : <User className="size-4.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">{u.name}</span>
                    <Badge tone={ROLE[u.role].tone} size="sm">
                      {ROLE[u.role].label}
                    </Badge>
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {u.department ?? "—"} · {u.email}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            ※ このアカウント選択はデモ専用の機能です。本番環境では表示されません。
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
