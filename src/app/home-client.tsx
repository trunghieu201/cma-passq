"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomePageClient() {
  const router = useRouter();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleQuickLogin = async () => {
    setLoadingDemo(true);
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
        throw new Error(data.error || "Không thể đăng nhập tài khoản mẫu.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã có lỗi xảy ra.");
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
              P
            </div>
            <div>
              <div className="text-lg font-bold text-ink-900 tracking-tight leading-none">
                Pass<span className="text-brand-600">Q</span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  CMA Part 2
                </span>
              </div>
              <p className="text-[11px] text-ink-600 hidden sm:block mt-0.5">
                Luyện thi Kế toán Quản trị Hoa Kỳ theo chuẩn môn MA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleQuickLogin}
              disabled={loadingDemo}
              size="sm"
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl gap-1.5 shadow-sm"
            >
              <Zap className="size-4 fill-amber-400 text-amber-400" />
              <span>{loadingDemo ? "Đang vào..." : "Vào học ngay"}</span>
            </Button>
            <Link href="/login">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold text-ink-800">
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 space-y-10">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
            Hệ thống học tập mô phỏng chuẩn PassQ môn Quản trị MA
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-ink-900 tracking-tight leading-tight">
            Luyện Thi <span className="text-brand-600">CMA Part 2</span> Chuẩn Quốc Tế
          </h1>

          <p className="text-sm sm:text-base text-ink-700 leading-relaxed">
            Nền tảng ôn thi tự chứa tích hợp toàn bộ ngân hàng <strong>7.609 câu hỏi giải chi tiết</strong>, 
            thuật toán lặp lại ngắt quãng <strong>SuperMemo SM-2</strong> và <strong>31 đề thi thử Prometric</strong>.
          </p>

          {/* Quick CTA Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={handleQuickLogin}
              disabled={loadingDemo}
              size="lg"
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-base px-6 py-6 rounded-2xl gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Zap className="size-5 fill-amber-300 text-amber-300" />
              <span>{loadingDemo ? "Đang đăng nhập..." : "Vào Bảng Điều Khiển Học Ngay"}</span>
            </Button>

            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="font-bold text-base px-6 py-6 rounded-2xl border-2 border-border bg-white hover:bg-slate-50 text-ink-900 shadow-sm"
              >
                <LogIn className="size-5 text-brand-600" />
                <span>Đăng nhập tài khoản cá nhân</span>
              </Button>
            </Link>
          </div>

          {errorMsg && (
            <p className="text-xs text-destructive font-medium">{errorMsg}</p>
          )}

          {/* Demo account banner */}
          <div className="mt-4 p-4 rounded-2xl bg-white border border-brand-200 shadow-sm max-w-lg mx-auto flex items-center justify-between text-left">
            <div>
              <div className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                <Sparkles className="size-4 text-brand-600" />
                Tài khoản mẫu có sẵn dữ liệu:
              </div>
              <div className="text-xs text-ink-600 mt-0.5">
                Email: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-brand-700">student@passq.test</code> | MK: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-brand-700">Password123!</code>
              </div>
            </div>
            <Button
              onClick={handleQuickLogin}
              disabled={loadingDemo}
              variant="secondary"
              size="sm"
              className="rounded-xl font-bold text-xs shrink-0 ml-3"
            >
              1-Click
            </Button>
          </div>
        </div>

        {/* 4 Big Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-border shadow-sm text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-brand-600">7.609</div>
            <div className="text-xs font-semibold text-ink-700">Câu hỏi Part 2</div>
            <div className="text-[11px] text-ink-500">Gleim 2025, UWorld & IMA</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-border shadow-sm text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-blue-600">14.190</div>
            <div className="text-xs font-semibold text-ink-700">Phân tích bẫy (Distractor)</div>
            <div className="text-[11px] text-ink-500">Giải thích cặn kẽ 4 đáp án</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-border shadow-sm text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">31</div>
            <div className="text-xs font-semibold text-ink-700">Đề Mock Exam</div>
            <div className="text-[11px] text-ink-500">Mô phỏng 100% Prometric</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-border shadow-sm text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-600">57</div>
            <div className="text-xs font-semibold text-ink-700">Tiểu mục Lộ trình</div>
            <div className="text-[11px] text-ink-500">Phân bố đều 6 Section A-F</div>
          </div>
        </div>

        {/* 3 Core Sections Showcase */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-ink-900 text-center">
            3 Trọng Tâm Học Tập Chuẩn PassQ Môn MA
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Bảng điều khiển */}
            <div className="p-6 rounded-2xl bg-white border border-border shadow-sm flex flex-col justify-between space-y-4 hover:border-brand-300 transition">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-brand-600 flex items-center justify-center shadow-xs">
                  <LayoutDashboard className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900">1. Bảng điều khiển (Dashboard)</h3>
                <p className="text-xs text-ink-700 leading-relaxed">
                  Theo dõi tiến độ tổng thể với biểu đồ đường kép so sánh giờ học dự kiến vs thực tế, đếm ngược ngày thi, chuỗi ngày học liên tục (streak) và thẻ tiếp tục bài học dang dở.
                </p>
                <ul className="text-xs text-ink-600 space-y-1.5 pt-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-brand-600" />
                    Biểu đồ đường kép (Dual-curve)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-brand-600" />
                    Đếm ngược ngày thi & modal đổi ngày
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-brand-600" />
                    Nút tắt nhảy vào bài học tiếp theo
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleQuickLogin}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl gap-2 text-xs"
              >
                <span>Vào Bảng Điều Khiển</span>
              </Button>
            </div>

            {/* 2. Lộ trình */}
            <div className="p-6 rounded-2xl bg-white border border-border shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 transition">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <Compass className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900">2. Lộ trình học (Roadmap)</h3>
                <p className="text-xs text-ink-700 leading-relaxed">
                  Cây phả hệ phân cấp rõ ràng 6 Section A-F, 15 Unit và 57 Subunit. Đánh dấu trạng thái hoàn thành và mở phòng luyện tập theo từng chuyên đề nhỏ.
                </p>
                <ul className="text-xs text-ink-600 space-y-1.5 pt-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-blue-600" />
                    Phân cấp 6 Section: A, B, C, D, E, F
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-blue-600" />
                    Theo dõi % hoàn thành từng Unit
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-blue-600" />
                    Luyện tập ngay theo Subunit cụ thể
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleQuickLogin}
                variant="outline"
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold rounded-xl gap-2 text-xs"
              >
                <span>Mở Lộ Trình Học</span>
              </Button>
            </div>

            {/* 3. Ôn tập hôm nay */}
            <div className="p-6 rounded-2xl bg-white border border-border shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 transition">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <RotateCcw className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900">3. Ôn tập hôm nay (Review)</h3>
                <p className="text-xs text-ink-700 leading-relaxed">
                  Trí nhớ dài hạn với thuật toán Spaced Repetition SM-2. Gạch ngang loại trừ phương án sai (strikethrough) và hiển thị phân tích bẫy chi tiết từng câu.
                </p>
                <ul className="text-xs text-ink-600 space-y-1.5 pt-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Hàng đợi câu hỏi đến hạn ôn hôm nay
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Gạch ngang loại trừ phương án sai
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Bẫy đáp án và giải thích chuyên sâu
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleQuickLogin}
                variant="outline"
                className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold rounded-xl gap-2 text-xs"
              >
                <span>Bắt Đầu Ôn Tập</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Feature quick links */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <div className="text-sm font-bold text-ink-900">Các tính năng hỗ trợ đi kèm:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={handleQuickLogin}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 cursor-pointer transition flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-red-100 text-brand-600 flex items-center justify-center shrink-0">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-ink-900">Thi thử Prometric (31 đề)</div>
                <div className="text-[11px] text-ink-600">100 câu, đồng hồ 180 phút</div>
              </div>
            </div>

            <div
              onClick={handleQuickLogin}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen className="size-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-ink-900">Sổ tay công thức (302 công thức)</div>
                <div className="text-[11px] text-ink-600">Tra cứu nhanh tài chính CMA</div>
              </div>
            </div>

            <div
              onClick={handleQuickLogin}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/30 cursor-pointer transition flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="size-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-ink-900">Luyện tập tùy chỉnh</div>
                <div className="text-[11px] text-ink-600">Chọn 5, 10, 20 câu ngẫu nhiên</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-6 text-center text-xs text-ink-500">
        <p>Hệ thống học tập & luyện thi CMA Part 2 — Thiết kế theo chuẩn giao diện PassQ môn MA</p>
      </footer>
    </div>
  );
}
