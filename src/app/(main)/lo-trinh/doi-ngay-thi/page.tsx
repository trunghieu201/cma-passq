"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ArrowLeft, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChangeExamDatePage() {
  const router = useRouter();
  const [examDate, setExamDate] = useState("");
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill with current user exam date
  useEffect(() => {
    async function loadCurrentPlan() {
      try {
        const res = await fetch("/api/user/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.examPlan?.targetExamDate) {
            const d = new Date(data.examPlan.targetExamDate);
            const dateStr = d.toISOString().split("T")[0];
            setExamDate(dateStr);
            calculateDays(dateStr);
          }
        }
      } catch (err) {
        // Ignore fallback
      }
    }
    loadCurrentPlan();
  }, []);

  const calculateDays = (dateStr: string) => {
    if (!dateStr) {
      setDaysRemaining(null);
      return;
    }
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    setDaysRemaining(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
  };

  const handleDateChange = (val: string) => {
    setExamDate(val);
    calculateDays(val);
  };

  // Preset window buttons
  const selectPresetWindow = (monthOffset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    d.setDate(15);
    const dateStr = d.toISOString().split("T")[0];
    handleDateChange(dateStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examDate) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);
      const res = await fetch("/api/user/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examDate }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật ngày thi.");
      }

      setSuccessMessage("Đã cập nhật ngày thi thành công! Lộ trình học đã được tính toán lại.");
      setTimeout(() => {
        router.push("/lo-trinh");
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsSaving(false);
    }
  };

  // Min date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split("T")[0];

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
          <Calendar className="size-7 text-brand-600" />
          Điều chỉnh ngày thi CMA Part 2
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Hệ thống PassQ tự động tính toán lại khối lượng học tập hàng tuần và tốc độ ôn luyện.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
        {/* Quick Window Selection */}
        <div>
          <label className="text-xs font-bold text-ink-700 uppercase tracking-wider block mb-2">
            Chọn nhanh theo các kỳ thi IMA quốc tế:
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectPresetWindow(1)}
              className="text-xs text-ink-800 hover:border-brand-300"
            >
              1 Tháng tới
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectPresetWindow(3)}
              className="text-xs text-ink-800 hover:border-brand-300"
            >
              3 Tháng tới
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectPresetWindow(6)}
              className="text-xs text-ink-800 hover:border-brand-300"
            >
              6 Tháng tới
            </Button>
          </div>
        </div>

        {/* Date Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-ink-900 block mb-1.5">
              Ngày thi dự kiến:
            </label>
            <input
              type="date"
              min={minDateStr}
              value={examDate}
              onChange={(e) => handleDateChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-ink-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {daysRemaining !== null && (
            <div className="p-4 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="size-5 text-brand-600" />
                <div>
                  <div className="text-xs text-ink-500 font-medium">Thời gian chuẩn bị</div>
                  <div className="text-sm font-bold text-ink-900">
                    Khoảng thời gian còn lại trước ngày thi
                  </div>
                </div>
              </div>
              <div className="text-2xl font-extrabold text-brand-600 font-mono">
                {daysRemaining} ngày
              </div>
            </div>
          )}

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
              disabled={isSaving || !examDate}
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold cursor-pointer"
            >
              {isSaving ? "Đang lưu..." : "Xác nhận & Cập nhật lộ trình"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
