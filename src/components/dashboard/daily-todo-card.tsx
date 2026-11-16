import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, CheckSquare, RotateCcw, ArrowRight } from "lucide-react";

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
  const totalItems =
    (dueFlashcards > 0 ? 1 : 0) +
    (practiceQuestionsGoal > 0 ? 1 : 0) +
    (weaknessQuestions > 0 ? 1 : 0);

  return (
    <Card className="h-full border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-ink-900 flex items-center gap-2">
            Việc cần làm hôm nay
          </CardTitle>
          <span className="bg-brand-50 text-brand-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-brand-200">
            {totalItems} mục
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
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
                Làm {practiceQuestionsGoal} câu trắc nghiệm kiểm tra
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
              href={`/luyen-tap?unit=${activeUnitId}`}
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
            <Link
              href="/luyen-tap?mode=weakness"
              className="gap-1"
            >
              <span>Luyện lại</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
