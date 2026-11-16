"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Target } from "lucide-react";

interface ExamDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: {
    targetExamDate: string;
    weeklyHours: number;
    targetScore: number;
    studyMode: string;
  };
  onSuccess: () => void;
}

export function ExamDateModal({
  isOpen,
  onClose,
  currentPlan,
  onSuccess,
}: ExamDateModalProps) {
  const [examDate, setExamDate] = useState(
    currentPlan.targetExamDate ? currentPlan.targetExamDate.slice(0, 10) : ""
  );
  const [weeklyHours, setWeeklyHours] = useState(currentPlan.weeklyHours || 10);
  const [targetScore, setTargetScore] = useState(currentPlan.targetScore || 400);
  const [studyMode, setStudyMode] = useState(currentPlan.studyMode || "standard");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/user/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate: examDate ? new Date(examDate).toISOString() : undefined,
          weeklyHours: Number(weeklyHours),
          targetScore: Number(targetScore),
          studyMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Cập nhật thất bại.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="recalibrate-modal" className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <Target className="size-5 text-brand-600" />
            Cập nhật kế hoạch học tập
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-500">
            Hệ thống sẽ tự động tính toán lại khối lượng học mỗi tuần dựa trên ngày thi của bạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-brand-50 text-brand-700 text-xs border border-brand-200">
              {errorMsg}
            </div>
          )}

          {/* 1. Ngày thi mục tiêu */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-ink-800 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-brand-600" />
                Ngày thi mục tiêu
              </label>
            </div>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-600/50"
            />
            {/* CMA Prometric Testing Window Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-ink-500 self-center mr-1">Cửa sổ thi IMA:</span>
              <button
                type="button"
                onClick={() => setExamDate("2027-02-15")}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted hover:bg-brand-50 hover:text-brand-700 transition cursor-pointer"
              >
                T1–T2/2027
              </button>
              <button
                type="button"
                onClick={() => setExamDate("2027-06-15")}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted hover:bg-brand-50 hover:text-brand-700 transition cursor-pointer"
              >
                T5–T6/2027
              </button>
              <button
                type="button"
                onClick={() => setExamDate("2027-10-15")}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted hover:bg-brand-50 hover:text-brand-700 transition cursor-pointer"
              >
                T9–T10/2027
              </button>
            </div>
          </div>

          {/* 2. Giờ học mỗi tuần */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-ink-800 flex items-center gap-1.5">
                <Clock className="size-3.5 text-brand-600" />
                Thời gian học mỗi tuần
              </label>
              <span className="text-xs font-bold text-brand-600">{weeklyHours} giờ/tuần</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-ink-400 mt-0.5">
              <span>5 giờ (Thư thả)</span>
              <span>15 giờ (Tiêu chuẩn)</span>
              <span>40 giờ (Cấp tốc)</span>
            </div>
          </div>

          {/* 3. Điểm số mục tiêu */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-ink-800">
                Điểm mục tiêu (CMA Scaled Score)
              </label>
              <span className="text-xs font-bold text-brand-600">{targetScore} / 500</span>
            </div>
            <input
              type="range"
              min="360"
              max="500"
              step="10"
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <span className="text-[11px] text-ink-500">
              Điểm đỗ tiêu chuẩn của IMA là <strong>360/500</strong>.
            </span>
          </div>

          {/* 4. Chế độ học */}
          <div>
            <label className="block text-xs font-semibold text-ink-800 mb-1.5">
              Chế độ học tập
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                data-testid="mode-standard"
                onClick={() => setStudyMode("standard")}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  studyMode === "standard"
                    ? "border-brand-600 bg-brand-50/50 text-brand-900 font-semibold"
                    : "border-border hover:bg-muted text-ink-700"
                }`}
              >
                <div className="font-bold">Bình thường</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Bài giảng → Thẻ → Bài tập</div>
              </button>
              <button
                type="button"
                data-testid="mode-fast-track"
                onClick={() => setStudyMode("fast_track")}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  studyMode === "fast_track" || studyMode === "fast-track"
                    ? "border-brand-600 bg-brand-50/50 text-brand-900 font-semibold"
                    : "border-border hover:bg-muted text-ink-700"
                }`}
              >
                <div className="font-bold">Ôn nhanh</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Vào thẳng câu hỏi & đề</div>
              </button>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-ink-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-brand-600 hover:bg-brand-500 text-white cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Đang lưu…" : "Lưu kế hoạch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
