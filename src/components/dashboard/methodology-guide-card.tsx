import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Compass } from "lucide-react";

export function MethodologyGuideCard() {
  const steps = [
    {
      step: "01",
      title: "Học từng chương",
      desc: "Mở đúng chương học dở. Đọc tóm tắt bài giảng cốt lõi, đoạn nào chưa hiểu bấm “Hỏi AI” ngay tại chỗ để được trợ lý giải thích cặn kẽ.",
      badgeColor: "bg-brand-50 text-brand-600 border-brand-200",
    },
    {
      step: "02",
      title: "Làm câu hỏi ngay",
      desc: "Học xong chương nào làm trắc nghiệm ngay chương đó. Hệ thống giải thích chi tiết phương án đúng và phân tích vì sao các phương án khác sai (Distractor Analysis).",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      step: "03",
      title: "Ôn vài phút mỗi ngày",
      desc: "Các thẻ thuật ngữ và câu hỏi đã học sẽ tự động quay lại “Ôn tập hôm nay” đúng vào thời điểm não chuẩn bị quên (SuperMemo SM-2). Chỉ 10-15 phút mỗi ngày.",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      step: "04",
      title: "Về đích",
      desc: "Hệ thống tự động gom câu sai vào “Điểm yếu”. 2 tuần trước kỳ thi, luyện đề Mock Exam 100 câu bấm giờ Prometric và ôn toàn bộ Sổ tay công thức.",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  ];

  return (
    <Card className="h-full border-border shadow-sm bg-gradient-to-br from-white via-white to-[#fcfbfe]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-ink-900 flex items-center gap-2">
          <Compass className="size-5 text-brand-600" />
          Cách học môn này (Phương pháp PassQ)
        </CardTitle>
        <CardDescription className="text-xs text-ink-500">
          4 bước chuẩn khoa học giúp bạn đỗ CMA Part 2 ngay lần thi đầu tiên
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {steps.map((s) => (
          <div
            key={s.step}
            data-testid="methodology-step-item"
            className="flex gap-3 items-start"
          >
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 mt-0.5 ${s.badgeColor}`}
            >
              {s.step}
            </span>
            <div>
              <div className="text-xs font-bold text-ink-900">{s.title}</div>
              <div className="text-xs text-ink-600 mt-0.5 leading-relaxed">
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
