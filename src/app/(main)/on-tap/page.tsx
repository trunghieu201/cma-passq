"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RotateCw,
  ArrowRight,
  Layers,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  Play,
  Calendar,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SrsReviewRunner, SrsItem } from "@/components/srs/srs-review-runner";

export default function SrsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = React.useRef(data);
  dataRef.current = data;

  // Review mode active?
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchSrsData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/reviews/today");
      if (!res.ok) {
        throw new Error("Không thể tải danh sách ôn tập hôm nay.");
      }
      const json = await res.json();
      setData(json);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("cma_cached_srs", JSON.stringify(json));
        } catch (e) {}
      }
    } catch (err: any) {
      if (!dataRef.current) {
        setError(err.message || "Đã có lỗi xảy ra.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("cma_cached_srs");
        if (cached) {
          setData(JSON.parse(cached));
          setIsLoading(false);
        }
      } catch (e) {}
    }
    fetchSrsData();

    let lastFocus = Date.now();
    const handleUpdate = () => {
      fetchSrsData();
    };
    const handleFocus = () => {
      if (Date.now() - lastFocus > 5000) {
        lastFocus = Date.now();
        fetchSrsData();
      }
    };

    window.addEventListener("cma:progress_updated", handleUpdate);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("cma:progress_updated", handleUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchSrsData]);

  const handleStartReview = () => {
    if (data?.items && data.items.length > 0) {
      setIsReviewing(true);
    }
  };

  const handleCompleteReview = () => {
    fetchSrsData();
  };

  const handleExitReview = () => {
    setIsReviewing(false);
  };

  // If in review runner mode
  if (isReviewing && data?.items) {
    return (
      <SrsReviewRunner
        items={data.items}
        onComplete={handleCompleteReview}
        onExit={handleExitReview}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-10 w-72 bg-ink-200 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-ink-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-ink-200 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-brand-600 font-semibold mb-3">
          {error || "Không tìm thấy dữ liệu ôn tập."}
        </p>
        <Button onClick={fetchSrsData} variant="outline" size="sm" className="gap-2">
          <RotateCw className="size-4" />
          Thử lại
        </Button>
      </div>
    );
  }

  const { dueCount, isSampleQueue, stages, retentionRate, masteredCount, totalReviewed, items } =
    data;

  const STAGE_CONFIGS = [
    {
      level: 1,
      title: "Giai đoạn 1",
      interval: "1 ngày",
      count: stages.stage1,
      desc: "Kiến thức vừa làm quen, cần ôn lại ngay",
      color: "border-blue-200 bg-blue-50/50 text-blue-900",
      badge: "bg-blue-100 text-blue-800",
    },
    {
      level: 2,
      title: "Giai đoạn 2",
      interval: "3 ngày",
      count: stages.stage2,
      desc: "Bắt đầu hình thành phản xạ nhận diện bẫy",
      color: "border-indigo-200 bg-indigo-50/50 text-indigo-900",
      badge: "bg-indigo-100 text-indigo-800",
    },
    {
      level: 3,
      title: "Giai đoạn 3",
      interval: "7 ngày",
      count: stages.stage3,
      desc: "Chuyển tiếp sang trí nhớ trung hạn",
      color: "border-purple-200 bg-purple-50/50 text-purple-900",
      badge: "bg-purple-100 text-purple-800",
    },
    {
      level: 4,
      title: "Giai đoạn 4",
      interval: "16 ngày",
      count: stages.stage4,
      desc: "Ghi nhớ cấu trúc logic & công thức cốt lõi",
      color: "border-amber-200 bg-amber-50/50 text-amber-900",
      badge: "bg-amber-100 text-amber-800",
    },
    {
      level: 5,
      title: "Giai đoạn 5",
      interval: "35 ngày",
      count: stages.stage5,
      desc: "Thành thạo dài hạn, sẵn sàng cho phòng thi",
      color: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
      badge: "bg-emerald-100 text-emerald-800",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <RotateCw className="size-7 text-brand-600" />
            Ôn tập hôm nay (Spaced Repetition)
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Thuật toán SuperMemo SM-2 tự động tính toán thời điểm sắp quên để nhắc lại tối ưu.
          </p>
        </div>
        <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-500 text-white">
          <Link href="/dashboard" className="gap-1.5">
            <span>Bảng điều khiển</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium">Thẻ đến hạn hôm nay</div>
          <div className="text-2xl md:text-3xl font-extrabold text-brand-600 font-mono mt-1">
            {dueCount}
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5">
            {isSampleQueue ? "Thẻ luyện tập khởi động" : "Cần ôn tập ngay"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium">Tỷ lệ duy trì trí nhớ</div>
          <div className="text-2xl md:text-3xl font-extrabold text-ink-900 font-mono mt-1">
            {retentionRate}%
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            Chỉ số gợi nhớ thành công
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium">Đã làm chủ (Mastered)</div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-600 font-mono mt-1">
            {masteredCount}
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5">Giai đoạn 4 & 5 (16–35 ngày)</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium">Tổng thẻ đã đưa vào SRS</div>
          <div className="text-2xl md:text-3xl font-extrabold text-ink-900 font-mono mt-1">
            {totalReviewed}
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5">Tích lũy từ các bài luyện tập</div>
        </div>
      </div>

      {/* 3. Launch Card: Big CTA */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/40 via-card to-background p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
            <Sparkles className="size-3.5" />
            <span>Thuật toán lặp lại ngắt quãng SM-2</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-900">
            {dueCount > 0
              ? `Bạn có ${dueCount} thẻ và câu hỏi cần ôn tập hôm nay`
              : "Hôm nay bạn đã ôn tập xong toàn bộ các thẻ đến hạn!"}
          </h2>
          <p className="text-xs md:text-sm text-ink-600 max-w-xl leading-relaxed">
            Mỗi ngày chỉ cần 10–15 phút ôn tập ngắt quãng sẽ giúp bạn ghi nhớ hơn 92% công thức, chỉ tiêu tài chính và chuẩn mực đạo đức CMA Part 2 cho đến ngày thi thật.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            size="lg"
            onClick={handleStartReview}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-base px-6 py-6 rounded-xl shadow-md gap-2.5 group cursor-pointer"
          >
            <span>Bắt đầu ôn tập ({dueCount} thẻ)</span>
            <Play className="size-5 fill-white transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>

      {/* 4. 5 Retention Stages Breakdown Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Layers className="size-4 text-brand-600" />
            Phân bố 5 tầng lưu trữ trí nhớ dài hạn (Memory Buckets)
          </h3>
          <span className="text-xs text-muted-foreground font-mono font-medium">
            Thuật toán SuperMemo SM-2
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STAGE_CONFIGS.map((stage) => (
            <div
              key={stage.level}
              className={`p-4 rounded-xl border ${stage.color} space-y-2 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {stage.title}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>
                    {stage.interval}
                  </span>
                </div>
                <div className="text-2xl font-extrabold font-mono mt-2">{stage.count} thẻ</div>
              </div>
              <p className="text-[11px] leading-snug opacity-80">{stage.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Pedagogical Guide Note */}
      <div className="p-4 rounded-xl border border-border bg-card text-xs text-ink-700 space-y-2">
        <div className="font-bold text-ink-900 flex items-center gap-1.5 text-sm">
          <Award className="size-4 text-brand-600" />
          Nguyên lý hoạt động của SM-2 trong PassQ:
        </div>
        <ul className="list-disc list-inside space-y-1 text-ink-600 text-xs">
          <li>
            <strong>Khi bạn trả lời Đúng và đánh giá &quot;Nhớ tốt&quot;:</strong> Khoảng cách ôn tập sẽ tăng dần (1 ngày → 3 ngày → 7 ngày → 16 ngày → 35 ngày).
          </li>
          <li>
            <strong>Khi bạn bấm &quot;Quên hẳn&quot;:</strong> Hệ thống sẽ tự động đưa thẻ quay về Giai đoạn 1 (1 ngày) và tăng tần suất xuất hiện trong tuần.
          </li>
          <li>
            <strong>Kết hợp lý thuyết và câu hỏi trắc nghiệm:</strong> Giúp bạn không chỉ thuộc vẹt công thức mà còn áp dụng thành thạo vào bài toán định giá và phân tích báo cáo tài chính CMA.
          </li>
        </ul>
      </div>
    </div>
  );
}
