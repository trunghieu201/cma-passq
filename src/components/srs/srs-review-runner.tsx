"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  RotateCw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  HelpCircle,
  Eye,
  Award,
  Clock,
  ChevronRight,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface SrsItem {
  reviewId: string;
  questionId: string;
  stage: number;
  intervalDays: number;
  easeFactor: number;
  consecutiveCorrect: number;
  lapses: number;
  question: {
    id: string;
    stem: string;
    basisScenario?: string | null;
    correctChoice: string;
    explanation: string;
    citation?: string | null;
    subunit?: { code: string; title: string };
    unit?: { unitNumber: number; title: string };
    section?: { code: string; title: string };
    choices: Array<{
      id: string;
      choiceKey: string;
      content: string;
      isCorrect?: boolean;
      distractorAnalysis?: string | null;
    }>;
  };
}

interface SrsReviewRunnerProps {
  items: SrsItem[];
  onComplete: () => void;
  onExit: () => void;
}

export function SrsReviewRunner({
  items,
  onComplete,
  onExit,
}: SrsReviewRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  // Completed session state
  const [sessionResults, setSessionResults] = useState<
    Array<{ questionId: string; rating: number; isSuccess: boolean }>
  >([]);
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  const currentItem = items[currentIndex];

  const handleSelectChoice = (key: string) => {
    if (isRevealed) return;
    setSelectedChoice(key);
    setIsRevealed(true);
  };

  const handleRevealAnswer = () => {
    setIsRevealed(true);
  };

  const handleGrade = async (rating: number) => {
    if (!currentItem || isGrading) return;
    setIsGrading(true);

    const timeSpentMs = Date.now() - startTimeRef.current;
    startTimeRef.current = Date.now();

    try {
      await fetch("/api/reviews/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentItem.questionId,
          rating,
          selectedChoice: selectedChoice || undefined,
          timeSpentMs,
        }),
      });

      const updatedResults = [
        ...sessionResults,
        {
          questionId: currentItem.questionId,
          rating,
          isSuccess: rating >= 3,
        },
      ];
      setSessionResults(updatedResults);

      // Move to next or finish
      if (currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedChoice(null);
        setIsRevealed(false);
      } else {
        // Finished all items
        setIsSessionFinished(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cma:progress_updated"));
          try {
            const confetti = (await import("canvas-confetti")).default;
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 },
            });
          } catch (e) {
            // Ignore
          }
        }
        onComplete();
      }
    } catch (err) {
      console.error("SRS grade error:", err);
    } finally {
      setIsGrading(false);
    }
  };

  // Keyboard navigation for SRS reviews (Space to flip, 1-5 to grade, A-D to pick)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      if (isSessionFinished) return;

      const key = e.key.toUpperCase();

      if (!isRevealed) {
        if (["A", "B", "C", "D"].includes(key)) {
          e.preventDefault();
          handleSelectChoice(key);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRevealAnswer();
        }
      } else {
        // Revealed: ratings 1 to 5
        if (e.key === "1") {
          e.preventDefault();
          handleGrade(1);
        } else if (e.key === "2" || e.key === "3") {
          e.preventDefault();
          handleGrade(3);
        } else if (e.key === "4" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleGrade(4);
        } else if (e.key === "5") {
          e.preventDefault();
          handleGrade(5);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRevealed, isGrading, isSessionFinished, currentItem]);

  if (!currentItem) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-border">
        <p className="text-sm text-ink-600">Đã hoàn thành phiên ôn tập!</p>
        <Button onClick={onExit} variant="outline" size="sm" className="mt-3">
          Quay lại
        </Button>
      </div>
    );
  }

  const q = currentItem.question;
  const isCorrectChoice = selectedChoice === q.correctChoice;

  // Stages text
  const STAGE_LABELS = [
    "Mới / Cần ôn lại (0 ngày)",
    "Giai đoạn 1 (1 ngày)",
    "Giai đoạn 2 (3 ngày)",
    "Giai đoạn 3 (7 ngày)",
    "Giai đoạn 4 (16 ngày)",
    "Giai đoạn 5 (35 ngày - Thành thạo)",
  ];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* 1. Header Bar */}
      <div className="p-3.5 md:p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-ink-600 -ml-1 text-xs"
          >
            <ArrowLeft className="size-4 mr-1" />
            <span>Thoát</span>
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs font-bold text-ink-900 bg-ink-100 px-2.5 py-1 rounded-md font-mono">
            Thẻ {currentIndex + 1} / {items.length}
          </span>
          <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            {STAGE_LABELS[Math.min(5, Math.max(0, currentItem.stage))]}
          </span>
        </div>

        <div className="text-xs text-ink-500 font-mono font-medium">
          SM-2 Ease: {currentItem.easeFactor}
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
        />
      </div>

      {/* 2. Question / Flashcard Content */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-7 shadow-sm space-y-6">
        {/* Unit & Subunit Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
          <span>
            {q.section?.code ? `Phần ${q.section.code} · ` : ""}
            {q.subunit?.code ? `Chương ${q.subunit.code}: ${q.subunit.title}` : ""}
          </span>
          {q.citation && <span className="font-medium text-[11px]">{q.citation}</span>}
        </div>

        {/* Stem */}
        <div className="space-y-3">
          {q.basisScenario && (
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-ink-800 whitespace-pre-line">
              <strong className="block text-amber-900 mb-1">Tình huống fact pattern:</strong>
              {q.basisScenario}
            </div>
          )}
          <h3 className="text-base md:text-lg font-semibold text-ink-900 leading-relaxed whitespace-pre-line">
            {q.stem}
          </h3>
        </div>

        {/* Choices */}
        <div className="space-y-2.5">
          {q.choices.map((c) => {
            const isSelected = selectedChoice === c.choiceKey;
            const isCorrect = c.choiceKey === q.correctChoice;

            let style = "border-border bg-card hover:border-brand-300 text-ink-900";
            let pillStyle = "bg-muted text-ink-700";

            if (isRevealed) {
              if (isCorrect) {
                style = "border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold";
                pillStyle = "bg-emerald-600 text-white font-bold";
              } else if (isSelected && !isCorrect) {
                style = "border-red-500 bg-red-50/60 text-red-950";
                pillStyle = "bg-red-600 text-white font-bold";
              } else {
                style = "border-border bg-muted/20 opacity-60";
              }
            } else if (isSelected) {
              style = "border-brand-600 bg-brand-50/50 shadow-xs ring-1 ring-brand-400 font-semibold";
              pillStyle = "bg-brand-600 text-white font-bold";
            }

            return (
              <div
                key={c.choiceKey}
                onClick={() => handleSelectChoice(c.choiceKey)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${style}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${pillStyle}`}
                >
                  {c.choiceKey}
                </div>
                <span className="text-sm leading-snug">{c.content}</span>
              </div>
            );
          })}
        </div>

        {/* Reveal Answer Button (if user wants to see answer without picking) */}
        {!isRevealed && (
          <div className="pt-2 text-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRevealAnswer}
              className="text-xs text-ink-700 gap-1.5 cursor-pointer"
            >
              <Eye className="size-3.5" />
              <span>Xem trực tiếp đáp án & giải thích</span>
            </Button>
          </div>
        )}

        {/* Explanation & Distractor Analysis */}
        {isRevealed && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/25 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              {selectedChoice ? (
                isCorrectChoice ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Đáp án chính xác: {q.correctChoice}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-brand-700 font-bold text-xs">
                    <XCircle className="size-4 text-brand-600" />
                    <span>Đáp án đúng là: {q.correctChoice}</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-ink-800 font-bold text-xs">
                  <CheckCircle2 className="size-4 text-brand-600" />
                  <span>Đáp án đúng: {q.correctChoice}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-ink-800 leading-relaxed space-y-1.5">
              <span className="font-bold text-ink-900 block uppercase tracking-wider text-[11px]">
                Giải thích chi tiết:
              </span>
              <div className="whitespace-pre-line bg-card p-3 rounded-lg border border-border">
                {q.explanation}
              </div>
            </div>

            {/* Distractor analyses */}
            <div className="space-y-1.5 pt-2 border-t border-brand-100">
              <span className="text-[11px] font-bold text-brand-900 uppercase tracking-wider block">
                Phân tích bẫy (Distractor Analysis):
              </span>
              {q.choices.map((c) => (
                <div
                  key={c.choiceKey}
                  className={`p-2.5 rounded-lg text-xs border ${
                    c.choiceKey === q.correctChoice
                      ? "bg-emerald-50/40 border-emerald-200 text-emerald-900"
                      : "bg-card border-border text-ink-700"
                  }`}
                >
                  <span className="font-bold mr-1">({c.choiceKey}):</span>
                  {c.distractorAnalysis ||
                    (c.choiceKey === q.correctChoice
                      ? "Đáp án chính xác."
                      : "Lựa chọn này là phương án nhiễu.")}
                </div>
              ))}
            </div>

            {/* 3. SM-2 Quality Rating Action Strip */}
            <div className="pt-4 border-t border-brand-200 space-y-2">
              <span className="text-xs font-bold text-ink-900 block text-center">
                Mức độ ghi nhớ của bạn đối với câu hỏi này:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Rating 1: Quên / Làm lại */}
                <button
                  type="button"
                  data-testid="srs-rating-1"
                  disabled={isGrading}
                  onClick={() => handleGrade(1)}
                  className="p-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100/80 text-red-800 text-center transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold">🔴 Quên hẳn</div>
                  <div className="text-[10px] text-red-600 mt-0.5 font-mono">
                    Lặp lại: 1 ngày [1]
                  </div>
                </button>

                {/* Rating 3: Khó */}
                <button
                  type="button"
                  data-testid="srs-rating-3"
                  disabled={isGrading}
                  onClick={() => handleGrade(3)}
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 text-amber-800 text-center transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold">🟠 Khó nhớ</div>
                  <div className="text-[10px] text-amber-700 mt-0.5 font-mono">
                    Lặp lại: 3 ngày [3]
                  </div>
                </button>

                {/* Rating 4: Nhớ tốt */}
                <button
                  type="button"
                  data-testid="srs-rating-4"
                  disabled={isGrading}
                  onClick={() => handleGrade(4)}
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-center transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold">🟢 Nhớ tốt</div>
                  <div className="text-[10px] text-emerald-700 mt-0.5 font-mono">
                    Lặp lại: 7-16 ngày [4]
                  </div>
                </button>

                {/* Rating 5: Rất dễ */}
                <button
                  type="button"
                  data-testid="srs-rating-5"
                  disabled={isGrading}
                  onClick={() => handleGrade(5)}
                  className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100/80 text-blue-800 text-center transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold">🔵 Rất dễ</div>
                  <div className="text-[10px] text-blue-700 mt-0.5 font-mono">
                    Lặp lại: 35 ngày [5]
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completion Dialog */}
      <Dialog open={isSessionFinished} onOpenChange={() => {}}>
        <DialogContent className="max-w-md p-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <Award className="size-8 text-brand-600" />
          </div>

          <div>
            <DialogTitle className="text-xl md:text-2xl font-bold text-ink-900">
              Xuất sắc! Hoàn thành ôn tập hôm nay
            </DialogTitle>
            <p className="text-xs text-ink-500 mt-1">
              Thuật toán SuperMemo SM-2 đã tự động xếp lịch lặp lại ngắt quãng để củng cố trí nhớ dài hạn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-ink-50 border border-ink-100 text-center">
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Số thẻ đã ôn</div>
              <div className="text-xl font-bold text-ink-900 font-mono mt-0.5">
                {sessionResults.length} thẻ
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Tỷ lệ nhớ tốt</div>
              <div className="text-xl font-bold text-brand-600 font-mono mt-0.5">
                {sessionResults.length > 0
                  ? Math.round(
                      (sessionResults.filter((r) => r.isSuccess).length /
                        sessionResults.length) *
                        100
                    )
                  : 100}
                %
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              asChild
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold cursor-pointer"
            >
              <Link href="/dashboard">Trở về Bảng điều khiển</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="text-ink-800 cursor-pointer"
            >
              <Link href="/lo-trinh">Xem Lộ trình môn học</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
