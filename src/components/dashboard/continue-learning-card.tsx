import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, BookOpen } from "lucide-react";

interface ActiveNode {
  id: string;
  code: string;
  title: string;
  unitNumber: number;
  unitTitle: string;
  sectionCode: string;
  sectionTitle: string;
  completionPct: number;
  continueUrl: string;
}

interface ContinueLearningCardProps {
  activeNode: ActiveNode | null;
}

export function ContinueLearningCard({ activeNode }: ContinueLearningCardProps) {
  if (!activeNode) {
    return (
      <Card className="h-full border-border shadow-sm flex flex-col justify-center items-center p-6 text-center">
        <BookOpen className="size-10 text-brand-400 mb-2" />
        <h3 className="font-bold text-ink-900">Bắt đầu lộ trình CMA Part 2</h3>
        <p className="text-xs text-ink-500 mt-1 mb-4">
          Hãy bắt đầu với chương đầu tiên: Báo cáo tài chính quy mô chung.
        </p>
        <Button asChild size="default" data-testid="continue-practice-cta">
          <Link href="/lo-trinh">Vào học ngay</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border shadow-sm hover:border-brand-300 transition-all duration-200">
      <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              Tiếp tục học
            </span>
            <span className="text-xs text-ink-500 font-medium">
              Phần {activeNode.sectionCode} · Chương {activeNode.unitNumber}
            </span>
          </div>

          <h3 className="text-lg md:text-xl font-bold text-ink-900 mt-2 line-clamp-2">
            Chương {activeNode.unitNumber}: {activeNode.title}
          </h3>
          <p className="text-xs text-ink-600 mt-0.5">{activeNode.unitTitle}</p>

          {/* Completion Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-ink-700 mb-1.5">
              <span>Tiến độ bài giảng & bài tập</span>
              <span className="text-brand-600 font-mono">{activeNode.completionPct}%</span>
            </div>
            <div className="h-2 w-full bg-brand-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, activeNode.completionPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="mt-5 pt-3 border-t border-ink-100">
          <div className="flex items-center justify-between gap-3">
            <Button
              asChild
              size="default"
              data-testid="continue-practice-cta"
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl shadow-sm gap-2 group cursor-pointer"
            >
              <Link href={activeNode.continueUrl}>
                <span>Vào học</span>
                <Play className="size-4 fill-white transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          {/* PassQ Characteristic Subtitle Tooltip */}
          <div className="flex items-center gap-1.5 text-xs text-ink-500 italic mt-3">
            <Sparkles className="size-3.5 text-brand-600 shrink-0" />
            <span>
              Nút này mở đúng chương bạn đang học dở. Đoạn nào chưa hiểu, bấm “Hỏi AI” ngay tại chỗ.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
