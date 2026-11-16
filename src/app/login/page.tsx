"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, AlertCircle, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập không thành công.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setEmail("student@passq.test");
    setPassword("Password123!");
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "student@passq.test",
          password: "Password123!",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập không thành công.");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white font-extrabold text-2xl shadow-sm mb-3">
            P
          </div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            Đăng nhập Pass<span className="text-brand-600">Q</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Luyện thi CMA Part 2 - Kế toán Quản trị Hoa Kỳ
          </p>
        </div>

        {/* Quick Demo Login One-Click Banner */}
        <div className="p-3.5 rounded-xl bg-brand-50/70 border border-brand-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-brand-600" />
              Tài khoản mẫu có sẵn:
            </span>
            <span className="text-[10px] font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
              Khuyên dùng
            </span>
          </div>
          <div className="text-[11px] text-ink-600 font-mono">
            student@passq.test / Password123!
          </div>
          <Button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
            size="sm"
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <Zap className="size-3.5 fill-amber-300 text-amber-300" />
            <span>Đăng nhập 1-Click bằng tài khoản mẫu</span>
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-ink-500">Hoặc nhập tài khoản</span>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            data-testid="auth-error-message"
            className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form data-testid="login-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Email đăng nhập
            </label>
            <input
              data-testid="email-input"
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@passq.test"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-600/50"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-ink-800">
                Mật khẩu
              </label>
            </div>
            <input
              data-testid="password-input"
              type="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-600/50"
            />
          </div>

          <Button
            data-testid="login-submit-button"
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full bg-ink-900 hover:bg-ink-800 text-white font-semibold rounded-xl gap-2 cursor-pointer shadow-xs"
          >
            <LogIn className="size-4" />
            <span>{isLoading ? "Đang xử lý..." : "Đăng nhập"}</span>
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
