"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sliders, ArrowLeft, CheckCircle2, Target, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RecalibratePlanPage() {
  const router = useRouter();
  const [weeklyHours, setWeeklyHours] = useState<number>(10);
  const [studyMode, setStudyMode] = useState<string>("standard");
  const [targetScore, setTargetScore] = useState<number>(400);

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCurrentPlan() {
      try {
        const res = await fetch("/api/user/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.examPlan) {
            setWeeklyHours(data.examPlan.weeklyHours || 10);
            setStudyMode(data.examPlan.studyMode || "standard");
            setTargetScore(data.examPlan.targetScore || 400);
          }
        }
      } catch (err) {
        // Fallback defaults
      }
    }
    loadCurrentPlan();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMessage(null);
      const res = await fetch("/api/user/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyHours,
          studyMode,
          targetScore,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật kế hoạch.");
      }

      setSuccessMessage("Đã cập nhật mục tiêu & kế hoạch học tập thành công!");
      setTimeout(() => {
        router.push("/lo-trinh");
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-ink-600">
          <Link href="/lo-trinh" className="gap-1.5">
            <ArrowLeft className="size-4" />
            <span>Quay lại Lộ trình</span>
          </Link>
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-ink-900 flex items-center gap-2">
          <Sliders className="size-7 text-brand-600" />
          Cập nhật kế hoạch học tập
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Tùy chỉnh thời gian cam kết mỗi tuần, chế độ học và điểm số mục tiêu CMA Part 2.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Weekly Hours */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                <Clock className="size-4 text-brand-600" />
                Thời gian cam kết học mỗi tuần:
              </label>
              <span className="text-base font-bold text-brand-600 font-mono">
                {weeklyHours} giờ / tuần
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(parseInt(e.target.value, 10))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ink-400 font-mono">
              <span>1 giờ (Nhẹ nhàng)</span>
              <span>10 giờ (Khuyến nghị)</span>
              <span>25+ giờ (Cấp tốc)</span>
            </div>
          </div>

          {/* 2. Target Scaled Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                <Target className="size-4 text-brand-600" />
                Điểm mục tiêu IMA Scaled Score (Thang 500):
              </label>
              <span className="text-base font-bold text-brand-600 font-mono">
                {targetScore} / 500
              </span>
            </div>
            <input
              type="range"
              min="360"
              max="500"
              step="5"
              value={targetScore}
              onChange={(e) => setTargetScore(parseInt(e.target.value, 10))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ink-400 font-mono">
              <span>360 (Điểm đỗ CMA)</span>
              <span>400 (Mục tiêu an toàn)</span>
              <span>460+ (Xuất sắc)</span>
            </div>
          </div>

          {/* 3. Study Mode Selection */}
          <div className="space-y-2.5">
            <label className="text-sm font-semibold text-ink-900 block">
              Chế độ phân bổ lộ trình:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setStudyMode("standard")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  studyMode === "standard"
                    ? "border-brand-600 bg-brand-50/40 shadow-xs"
                    : "border-border hover:border-ink-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink-900">Tiêu chuẩn</span>
                  {studyMode === "standard" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                  )}
                </div>
                <p className="text-xs text-ink-600 mt-1">
                  Tuần tự theo 6 phần A–F, làm trọn bộ câu hỏi và củng cố hàng tuần.
                </p>
              </div>

              <div
                onClick={() => setStudyMode("fast_track")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  studyMode === "fast_track"
                    ? "border-brand-600 bg-brand-50/40 shadow-xs"
                    : "border-border hover:border-ink-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
                    <Zap className="size-4 text-amber-500" />
                    Cấp tốc (Fast-track)
                  </span>
                  {studyMode === "fast_track" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                  )}
                </div>
                <p className="text-xs text-ink-600 mt-1">
                  Tập trung trọng số cao (Phần A 20%, B 20%, C 25%), ưu tiên luyện câu bẫy và ôn điểm yếu.
                </p>
              </div>
            </div>
          </div>

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button asChild variant="ghost" size="default">
              <Link href="/lo-trinh">Hủy</Link>
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold cursor-pointer"
            >
              {isSaving ? "Đang lưu..." : "Lưu kế hoạch"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
