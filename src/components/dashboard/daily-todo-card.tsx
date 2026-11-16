"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, CheckSquare, RotateCcw, ArrowRight, Settings2 } from "lucide-react";

interface DailyTodoProps {
  dueFlashcards: number;
  practiceQuestionsGoal: number;
  weaknessQuestions: number;
  activeUnitTitle?: string;
  activeUnitId?: string;
}

export function DailyTodoCard({
  dueFlashcards,
  practiceQuestionsGoal,
  weaknessQuestions,
  activeUnitTitle = "Chương 1",
  activeUnitId = "u1",
}: DailyTodoProps) {
  const [goal, setGoal] = useState<number>(practiceQuestionsGoal || 20);
  const [showAdjust, setShowAdjust] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGoal = localStorage.getItem("cma_daily_goal");
      if (savedGoal) {
        setGoal(Number(savedGoal));
      }
    }
  }, []);

  const handleUpdateGoal = (newGoal: number) => {
    setGoal(newGoal);
    if (typeof window !== "undefined") {
      localStorage.setItem("cma_daily_goal", String(newGoal));
    }
  };

  const totalItems =
    (dueFlashcards > 0 ? 1 : 0) +
    (goal > 0 ? 1 : 0) +
    (weaknessQuestions > 0 ? 1 : 0);

  return (
    <Card className="h-full border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-ink-900 flex items-center gap-2">
            Việc cần làm hôm nay
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdjust(!showAdjust)}
              className="text-xs text-ink-500 hover:text-ink-800 flex items-center gap-1 cursor-pointer"
              title="Tùy chỉnh mục tiêu hàng ngày"
            >
              <Settings2 className="size-3.5" />
              <span>Chỉnh mục tiêu</span>
            </button>
            <span className="bg-brand-50 text-brand-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-brand-200">
              {totalItems} mục
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Quick Goal Adjuster Dropdown / Accordion */}
        {showAdjust && (
          <div className="p-3 bg-muted/40 rounded-xl border border-border/80 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-ink-800">Mục tiêu câu hỏi / ngày:</span>
              <span className="font-bold text-brand-600 font-mono">{goal} câu</span>
            </div>
            <div className="flex gap-2">
              {[10, 20, 30, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleUpdateGoal(val)}
                  className={`flex-1 py-1 rounded text-center font-bold text-xs transition cursor-pointer ${
                    goal === val
                      ? "bg-brand-600 text-white shadow-xs"
                      : "bg-card border border-border text-ink-700 hover:bg-muted"
                  }`}
                >
                  {val} câu
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Item 1: Flashcards */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-ink-100 hover:border-purple-200 hover:bg-purple-50/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 shrink-0">
              <Layers className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900">
                Ôn tập {dueFlashcards} thẻ Flashcard đến hạn
              </div>
              <div className="text-xs text-ink-500">
                Lặp lại ngắt quãng SM-2 giúp nhớ lâu thuật ngữ & công thức
              </div>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-brand-600 hover:bg-brand-500 text-white shrink-0 cursor-pointer"
          >
            <Link href="/on-tap" className="gap-1">
              <span>Ôn ngay</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>

        {/* Item 2: Practice Checkpoint Questions */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-ink-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 shrink-0">
              <CheckSquare className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900">
                Làm {goal} câu trắc nghiệm kiểm tra
              </div>
              <div className="text-xs text-ink-500">
                Luyện tập {activeUnitTitle} để kiểm tra mức độ nắm bài
              </div>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 text-ink-800 cursor-pointer"
          >
            <Link
              href={`/luyen-tap?unit=${activeUnitId}&limit=${goal}`}
              className="gap-1"
            >
              <span>Bắt đầu</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>

        {/* Item 3: Weakness / Wrong Questions */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-ink-100 hover:border-red-200 hover:bg-red-50/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-brand-50 text-brand-600 shrink-0">
              <RotateCcw className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900">
                Ôn {weaknessQuestions} câu đã từng làm sai (Điểm yếu)
              </div>
              <div className="text-xs text-ink-500">
                Luyện lại các câu sai để không lặp lại lỗi khi thi thật
              </div>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 text-ink-800 cursor-pointer"
          >
            <Link href="/luyen-tap?mode=weakness" className="gap-1">
              <span>Luyện lại</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
