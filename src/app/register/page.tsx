"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng ký không thành công.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white font-extrabold text-2xl shadow-sm mb-3">
            P
          </div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            Tạo tài khoản Pass<span className="text-brand-600">Q</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Bắt đầu lộ trình luyện thi CMA Part 2 chuẩn IMA
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            data-testid="auth-error-message"
            className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form data-testid="register-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Họ và tên
            </label>
            <input
              data-testid="name-input"
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-600/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Email
            </label>
            <input
              data-testid="email-input"
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@passq.test"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-600/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Mật khẩu (tối thiểu 6 ký tự)
            </label>
            <input
              data-testid="password-input"
              type="password"
              name="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-600/50"
            />
          </div>

          <Button
            data-testid="register-submit-button"
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl gap-2 cursor-pointer"
          >
            <UserPlus className="size-4" />
            <span>{isLoading ? "Đang xử lý..." : "Đăng ký tài khoản"}</span>
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
