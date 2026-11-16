"use client";

import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  Play,
  RotateCw,
  Award,
  Layers,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

export interface SubunitCategory {
  id: string;
  name: string;
  description: string | null;
  formulaHint?: string | null;
  questionCount?: number;
}

export interface SubunitData {
  id: string;
  code: string;
  title: string;
  questionCount: number;
  unit?: {
    number: number;
    title: string;
  };
  section?: {
    code: string;
    title: string;
    weight: number;
  };
  categories?: SubunitCategory[];
  progress?: {
    status: string;
    stars: number;
    accuracyPct: number;
    attemptsCount: number;
  };
}

interface SubunitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subunit: SubunitData | null;
}

export function SubunitDetailModal({
  isOpen,
  onClose,
  subunit,
}: SubunitDetailModalProps) {
  const [questionCount, setQuestionCount] = React.useState<number>(10);
  const [studyMode, setStudyMode] = React.useState<"practice" | "exam">("practice");

  if (!subunit) return null;

  const stars = subunit.progress?.stars || 0;
  const accuracy = subunit.progress?.accuracyPct || 0;
  const attempts = subunit.progress?.attemptsCount || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
              Chương {subunit.code}
            </span>
            {subunit.section && (
              <span className="text-xs text-muted-foreground font-medium">
                Phần {subunit.section.code}: {subunit.section.title} ({subunit.section.weight}%)
              </span>
            )}
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold text-ink-900">
            {subunit.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-500">
            {subunit.unit?.title ? `Thuộc Unit: ${subunit.unit.title} · ` : ""}
            Ngân hàng {subunit.questionCount.toLocaleString()} câu hỏi kèm phân tích bẫy chi tiết
          </DialogDescription>
        </DialogHeader>

        {/* User Progress Stats for this subunit */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-ink-50 border border-ink-100 text-center">
          <div>
            <div className="text-[11px] text-ink-500 font-medium">Mức độ đạt được</div>
            <div className="flex items-center justify-center gap-0.5 mt-0.5 text-amber-500">
              {[1, 2, 3].map((star) => (
                <span
                  key={star}
                  className={star <= stars ? "opacity-100" : "opacity-30"}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-ink-500 font-medium">Độ chính xác</div>
            <div className="text-base font-bold text-ink-900 font-mono mt-0.5">
              {accuracy}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-ink-500 font-medium">Số lượt luyện</div>
            <div className="text-base font-bold text-ink-900 font-mono mt-0.5">
              {attempts} lượt
            </div>
          </div>
        </div>

        {/* Categories / Topics breakdown */}
        <div className="space-y-2.5">
          <h4 className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <Layers className="size-4 text-brand-600" />
            Các chủ đề kiến thức cốt lõi (LOS):
          </h4>

          {subunit.categories && subunit.categories.length > 0 ? (
            <div className="space-y-2">
              {subunit.categories.map((cat, idx) => (
                <div
                  key={cat.id || idx}
                  className="p-3 rounded-lg border border-border bg-card hover:border-brand-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-900">
                      {idx + 1}. {cat.name}
                    </span>
                    {cat.questionCount ? (
                      <span className="text-[11px] font-semibold text-muted-foreground shrink-0 bg-muted px-2 py-0.5 rounded">
                        {cat.questionCount} câu
                      </span>
                    ) : null}
                  </div>
                  {cat.description && (
                    <p className="text-xs text-ink-600 mt-1">{cat.description}</p>
                  )}
                  {cat.formulaHint && (
                    <div className="mt-2 text-xs font-mono bg-brand-50/60 text-brand-900 p-2 rounded border border-brand-100">
                      💡 {cat.formulaHint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-ink-500 italic p-3 bg-muted/40 rounded-lg">
              Bộ câu hỏi bao quát đầy đủ lý thuyết, bài toán tính toán và phân tích quyết định chuẩn CMA.
            </div>
          )}
        </div>

        {/* Pedagogical Guidance Tip */}
        <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900 flex items-start gap-2.5">
          <Sparkles className="size-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Phương pháp PassQ:</strong> Làm trước 10 câu để nhận diện lỗ hổng. Xem kỹ phân tích bẫy (Distractor Analysis) tại mỗi đáp án sai trước khi làm lượt tiếp theo.
          </div>
        </div>

        {/* Quick Quiz Options */}
        <div className="p-3.5 rounded-xl border border-border bg-ink-50/60 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-800">
            <span>Tùy chọn luyện tập:</span>
            <span className="text-muted-foreground font-normal">Ngân hàng: {subunit.questionCount} câu</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            {/* Number of questions */}
            <div className="flex items-center gap-1.5">
              <span className="text-ink-600">Số câu:</span>
              {[10, 20, 30, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                    questionCount === num
                      ? "bg-brand-600 text-white shadow-xs"
                      : "bg-card border border-border text-ink-700 hover:bg-muted"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Mode: Instant vs Exam */}
            <div className="flex items-center gap-1.5">
              <span className="text-ink-600">Chế độ:</span>
              <button
                type="button"
                onClick={() => setStudyMode("practice")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  studyMode === "practice"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-card border border-border text-ink-700 hover:bg-muted"
                }`}
              >
                Học tập
              </button>
              <button
                type="button"
                onClick={() => setStudyMode("exam")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  studyMode === "exam"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-card border border-border text-ink-700 hover:bg-muted"
                }`}
              >
                Kiểm tra
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto text-ink-800 cursor-pointer"
            onClick={onClose}
          >
            <Link href={`/on-tap`}>
              <RotateCw className="size-4 mr-1.5" />
              Ôn thẻ ghi nhớ
            </Link>
          </Button>

          <Button
            asChild
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white font-semibold cursor-pointer gap-2"
            onClick={onClose}
          >
            <Link href={`/luyen-tap?subunit=${subunit.id}&mode=${studyMode}&limit=${questionCount}`}>
              <span>Bắt đầu luyện tập ({questionCount} câu)</span>
              <Play className="size-4 fill-white" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
