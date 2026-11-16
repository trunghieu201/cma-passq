"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileQuestion,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Shuffle,
  Bookmark,
  Layers,
  ChevronRight,
  Play,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizRunner, QuestionItem } from "@/components/practice/quiz-runner";

function PracticeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const subunitParam = searchParams.get("subunit") || searchParams.get("subunitId");
  const unitParam = searchParams.get("unit") || searchParams.get("unitId");
  const sectionParam = searchParams.get("section") || searchParams.get("sectionId");
  const modeParam = searchParams.get("mode");
  const limitParam = searchParams.get("limit");

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("Luyện tập câu hỏi");

  // Subunit catalog for custom selection in Hub
  const [subunits, setSubunits] = useState<any[]>([]);
  const [selectedSubunitId, setSelectedSubunitId] = useState<string>("");

  useEffect(() => {
    // If query params are provided, fetch practice questions
    if (subunitParam || unitParam || sectionParam || modeParam) {
      async function fetchQuestions() {
        try {
          setIsLoading(true);
          setError(null);

          const params = new URLSearchParams();
          if (subunitParam) params.set("subunitId", subunitParam);
          if (unitParam) params.set("unitId", unitParam);
          if (sectionParam) params.set("sectionId", sectionParam);
          if (modeParam) params.set("mode", modeParam);
          params.set("limit", limitParam || "10");

          const res = await fetch(`/api/questions?${params.toString()}`);
          if (!res.ok) throw new Error("Không thể tải danh sách câu hỏi.");
          const data = await res.json();

          if (!data.questions || data.questions.length === 0) {
            setError(
              modeParam === "weakness"
                ? "Bạn chưa có câu hỏi nào bị làm sai hoặc cần củng cố!"
                : modeParam === "bookmarked"
                ? "Bạn chưa đánh dấu câu hỏi nào!"
                : "Không tìm thấy câu hỏi phù hợp."
            );
          } else {
            setQuestions(data.questions);
            if (subunitParam && data.questions[0]?.subunit?.title) {
              setActiveTitle(`Chương ${data.questions[0].subunit.code}: ${data.questions[0].subunit.title}`);
            } else if (modeParam === "weakness") {
              setActiveTitle("Ôn luyện điểm yếu (Câu từng làm sai)");
            } else if (modeParam === "bookmarked") {
              setActiveTitle("Luyện tập các câu hỏi đã lưu");
            } else {
              setActiveTitle("Luyện tập câu hỏi trắc nghiệm CMA Part 2");
            }
          }
        } catch (err: any) {
          setError(err.message || "Đã có lỗi xảy ra.");
        } finally {
          setIsLoading(false);
        }
      }
      fetchQuestions();
    } else {
      // Hub mode: fetch list of subunits for quick picker
      async function loadSubunits() {
        try {
          const res = await fetch("/api/curriculum/subunits");
          if (res.ok) {
            const data = await res.json();
            setSubunits(data || []);
            if (data.length > 0) setSelectedSubunitId(data[0].id);
          }
        } catch (e) {
          // Ignore
        }
      }
      loadSubunits();
    }
  }, [subunitParam, unitParam, sectionParam, modeParam, limitParam]);

  const handleExitQuiz = () => {
    router.push("/luyen-tap");
    setQuestions([]);
    setError(null);
  };

  // If questions are loaded, render interactive QuizRunner
  if (questions.length > 0) {
    return (
      <QuizRunner
        questions={questions}
        title={activeTitle}
        subunitId={subunitParam || undefined}
        onExit={handleExitQuiz}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl mx-auto">
        <div className="h-12 bg-ink-100 rounded-xl w-full" />
        <div className="h-64 bg-ink-100 rounded-xl w-full" />
      </div>
    );
  }

  // Error / empty state
  if (error) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-xl border border-border bg-card text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
          <FileQuestion className="size-6" />
        </div>
        <p className="text-sm font-semibold text-ink-900">{error}</p>
        <div className="pt-2">
          <Button onClick={handleExitQuiz} variant="outline" size="sm">
            Quay lại Trung tâm luyện tập
          </Button>
        </div>
      </div>
    );
  }

  // Practice Hub UI
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <FileQuestion className="size-7 text-brand-600" />
            Luyện tập câu hỏi trắc nghiệm
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Ngân hàng 7,609 câu hỏi giải chi tiết và 14,190 phân tích bẫy (Distractor Analysis) chuẩn IMA CMA.
          </p>
        </div>
        <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-500 text-white">
          <Link href="/dashboard" className="gap-1.5">
            <span>Bảng điều khiển</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Practice Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Subunit Practice with Picker */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-brand-50 text-brand-600">
                <BookOpen className="size-5" />
              </span>
              <h3 className="text-base font-bold text-ink-900">
                Luyện theo chương (Subunit Practice)
              </h3>
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">
              Chọn một chương học cụ thể để làm bộ 10 câu trắc nghiệm kiểm tra độ hiểu bài ngay lập tức.
            </p>

            {/* Subunit Select dropdown */}
            {subunits.length > 0 && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-ink-700 block mb-1">
                  Chọn chương học:
                </label>
                <select
                  value={selectedSubunitId}
                  onChange={(e) => setSelectedSubunitId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {subunits.map((su) => (
                    <option key={su.id} value={su.id}>
                      {su.code} — {su.name} ({su.questionCount} câu)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="text-xs text-ink-600">
              <Link href="/lo-trinh">Xem trên Lộ trình</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold cursor-pointer gap-1.5"
            >
              <Link href={`/luyen-tap?subunit=${selectedSubunitId || "2.1.1"}&mode=practice`}>
                <span>Bắt đầu (10 câu)</span>
                <Play className="size-3.5 fill-white" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Card 2: Weakness Practice */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-red-50 text-brand-600">
                <RotateCcw className="size-5" />
              </span>
              <h3 className="text-base font-bold text-ink-900">
                Ôn luyện điểm yếu (Weakness Practice)
              </h3>
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">
              Hệ thống lọc tự động các câu bạn đã từng làm sai hoặc có tỷ lệ quên cao để luyện lại cho đến khi thành thạo.
            </p>
            <div className="p-3 rounded-lg bg-brand-50/50 border border-brand-100 text-xs text-brand-900 flex items-center gap-2">
              <Sparkles className="size-4 text-brand-600 shrink-0" />
              <span>Khuyến nghị PassQ: Luyện lại điểm yếu mỗi tuần để không bị bẫy trong kỳ thi thật.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end">
            <Button
              asChild
              size="sm"
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold cursor-pointer gap-1.5"
            >
              <Link href="/luyen-tap?mode=weakness">
                <span>Luyện câu sai</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Card 3: Random Practice */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Shuffle className="size-5" />
              </span>
              <h3 className="text-base font-bold text-ink-900">
                Luyện ngẫu nhiên (Mixed Practice)
              </h3>
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">
              Ngẫu nhiên 10 câu trắc nghiệm trải rộng 6 phần A–F giúp rèn luyện phản xạ chuyển đổi ngữ cảnh nhanh.
            </p>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-ink-800 font-semibold cursor-pointer gap-1.5"
            >
              <Link href="/luyen-tap?mode=practice&limit=10">
                <span>Luyện 10 câu ngẫu nhiên</span>
                <Play className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Card 4: Bookmarked Questions */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Bookmark className="size-5" />
              </span>
              <h3 className="text-base font-bold text-ink-900">
                Câu hỏi đã đánh dấu (Bookmarks)
              </h3>
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">
              Luyện tập các câu hỏi bạn đã chủ động lưu lại trong lúc đọc giải thích hoặc làm bài.
            </p>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-ink-800 font-semibold cursor-pointer gap-1.5"
            >
              <Link href="/luyen-tap?mode=bookmarked">
                <span>Luyện câu đã lưu</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="h-64 bg-ink-100 rounded-xl animate-pulse" />}>
      <PracticeContent />
    </Suspense>
  );
}
