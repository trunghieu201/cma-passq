"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bookmark,
  ArrowRight,
  BookmarkCheck,
  Trash2,
  Play,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/bookmarks");
      if (!res.ok) throw new Error("Không thể tải danh sách câu hỏi đã lưu.");
      const data = await res.json();
      setBookmarks(data.bookmarks || []);
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRemoveBookmark = async (questionId: string) => {
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      setBookmarks((prev) => prev.filter((b) => b.question.id !== questionId));
    } catch (e) {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <Bookmark className="size-7 text-brand-600" />
            Nội dung đã đánh dấu (Đã lưu)
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Danh sách câu hỏi bạn đã chủ động lưu lại để ôn tập chuyên sâu trước kỳ thi CMA Part 2.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bookmarks.length > 0 && (
            <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-500 text-white">
              <Link href="/luyen-tap?mode=bookmarked" className="gap-1.5">
                <Play className="size-3.5 fill-white" />
                <span>Luyện các câu đã lưu</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard" className="gap-1.5">
              <span>Bảng điều khiển</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Bookmarks List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-ink-100 rounded-xl" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="max-w-xl mx-auto rounded-xl border border-border bg-card p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <BookmarkCheck className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-ink-900">Chưa có câu hỏi nào được lưu</h2>
          <p className="text-sm text-ink-600 leading-relaxed">
            Trong lúc làm câu hỏi trắc nghiệm hoặc đọc bài giảng, bạn có thể bấm biểu tượng bookmark để lưu lại các câu hay hoặc cần xem lại.
          </p>
          <div className="pt-2">
            <Button asChild size="default" className="bg-brand-600 hover:bg-brand-500 text-white">
              <Link href="/luyen-tap">Bắt đầu luyện câu hỏi</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((b) => {
            const q = b.question;
            return (
              <div
                key={b.id}
                className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3 hover:border-brand-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {q.section?.code && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                        Phần {q.section.code}
                      </span>
                    )}
                    {q.subunit?.code && (
                      <span className="text-xs font-semibold text-ink-600">
                        Chương {q.subunit.code}: {q.subunit.title}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveBookmark(q.id)}
                    title="Xóa khỏi danh sách đã lưu"
                    className="text-xs text-ink-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-ink-900 leading-relaxed whitespace-pre-line">
                  {q.stem}
                </h3>

                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-950">
                  <span className="font-bold mr-1">Đáp án đúng: ({q.correctChoice})</span>
                  {q.choices.find((c: any) => c.choiceKey === q.correctChoice)?.content}
                </div>

                <div className="text-xs text-ink-600 whitespace-pre-line border-t border-ink-100 pt-2 line-clamp-2">
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
