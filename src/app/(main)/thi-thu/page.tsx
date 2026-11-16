"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Clock,
  Award,
  Play,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Flag,
  Strikethrough,
  Layers,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MockExamSummary {
  id: string;
  name: string;
  part: number;
  questionCount: number;
  durationMinutes: number;
  latestAttempt?: {
    score: number;
    scaledScore: number;
    isPassed: boolean;
    completedAt: string;
    totalTimeSeconds: number;
  } | null;
}

export default function MockExamPage() {
  const [mockList, setMockList] = useState<MockExamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active exam session
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [eliminatedChoices, setEliminatedChoices] = useState<Record<string, string[]>>({});
  const [secondsLeft, setSecondsLeft] = useState(180 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userAnswersRef = useRef(userAnswers);
  userAnswersRef.current = userAnswers;
  const secondsLeftRef = useRef(secondsLeft);
  secondsLeftRef.current = secondsLeft;
  const activeExamRef = useRef(activeExam);
  activeExamRef.current = activeExam;

  const fetchMockList = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/mock-exams");
      if (!res.ok) throw new Error("Không thể tải danh sách đề thi thử.");
      const data = await res.json();
      setMockList(data.mockExams || []);
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMockList();
  }, [fetchMockList]);

  // Timer countdown for active exam
  useEffect(() => {
    if (activeExam && examQuestions.length > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinalSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [activeExam, examQuestions.length]);

  const handleStartExam = async (mockId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/mock-exams/${mockId}`);
      if (!res.ok) throw new Error("Không thể tải nội dung đề thi.");
      const data = await res.json();

      setActiveExam(data);
      setExamQuestions(data.questions || []);
      setCurrentIndex(0);
      setUserAnswers({});
      setFlaggedQuestions({});
      setEliminatedChoices({});
      setSecondsLeft((data.durationMinutes || 180) * 60);
      setExamResult(null);

      // Restore saved draft if user previously refreshed
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(`cma_exam_draft_${mockId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.userAnswers) setUserAnswers(parsed.userAnswers);
            if (parsed.eliminatedChoices) setEliminatedChoices(parsed.eliminatedChoices);
            if (parsed.flaggedQuestions) setFlaggedQuestions(parsed.flaggedQuestions);
            if (typeof parsed.currentIndex === "number") setCurrentIndex(parsed.currentIndex);
            if (typeof parsed.secondsLeft === "number" && parsed.secondsLeft > 0) {
              setSecondsLeft(parsed.secondsLeft);
            }
          }
        } catch (e) {}
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khởi động đề thi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save exam progress to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !activeExam || examResult) return;
    if (Object.keys(userAnswers).length === 0) return;
    try {
      localStorage.setItem(
        `cma_exam_draft_${activeExam.id}`,
        JSON.stringify({
          userAnswers,
          eliminatedChoices,
          flaggedQuestions,
          currentIndex,
          secondsLeft,
          savedAt: Date.now(),
        })
      );
    } catch (e) {}
  }, [activeExam, userAnswers, eliminatedChoices, flaggedQuestions, currentIndex, secondsLeft, examResult]);

  // Keyboard navigation for exam simulator
  useEffect(() => {
    if (!activeExam || examQuestions.length === 0 || examResult) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      if (showSubmitConfirm || showPalette) return;

      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(key)) {
        e.preventDefault();
        handleSelectChoice(key);
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const mapKeys: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D" };
        handleSelectChoice(mapKeys[e.key]);
      } else if (key === "S") {
        e.preventDefault();
        const q = examQuestions[currentIndex];
        if (q) {
          const choiceToElim = userAnswers[q.id] || "A";
          toggleEliminateKey(choiceToElim);
        }
      } else if (key === "F") {
        e.preventDefault();
        toggleFlag();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < examQuestions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentIndex < examQuestions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setShowSubmitConfirm(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeExam, examQuestions, currentIndex, userAnswers, showSubmitConfirm, showPalette, examResult]);

  const handleSelectChoice = (choiceKey: string) => {
    const q = examQuestions[currentIndex];
    if (!q) return;
    setUserAnswers((prev) => ({
      ...prev,
      [q.id]: choiceKey,
    }));
    // Auto un-eliminate if user decides to select this choice
    setEliminatedChoices((prev) => {
      const currentList = prev[q.id] || [];
      if (currentList.includes(choiceKey)) {
        return { ...prev, [q.id]: currentList.filter((k) => k !== choiceKey) };
      }
      return prev;
    });
  };

  const toggleEliminateKey = (choiceKey: string) => {
    const q = examQuestions[currentIndex];
    if (!q) return;
    const isCurrentlyEliminated = (eliminatedChoices[q.id] || []).includes(choiceKey);
    setEliminatedChoices((prev) => {
      const currentList = prev[q.id] || [];
      const updated = isCurrentlyEliminated
        ? currentList.filter((k) => k !== choiceKey)
        : [...currentList, choiceKey];
      return { ...prev, [q.id]: updated };
    });

    // If striking out the answer that was currently selected, deselect it
    if (!isCurrentlyEliminated) {
      setUserAnswers((prev) => {
        if (prev[q.id] === choiceKey) {
          const updated = { ...prev };
          delete updated[q.id];
          return updated;
        }
        return prev;
      });
    }
  };

  const toggleEliminate = (e: React.MouseEvent, choiceKey: string) => {
    e.stopPropagation();
    toggleEliminateKey(choiceKey);
  };

  const toggleFlag = () => {
    const q = examQuestions[currentIndex];
    if (!q) return;
    setFlaggedQuestions((prev) => ({
      ...prev,
      [q.id]: !prev[q.id],
    }));
  };

  const handleFinalSubmit = async () => {
    const exam = activeExamRef.current;
    if (!exam) return;
    setShowSubmitConfirm(false);
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const answersToSubmit = userAnswersRef.current;
    const totalTimeSpent = Math.max(1, (exam.durationMinutes * 60) - secondsLeftRef.current);

    try {
      const res = await fetch(`/api/mock-exams/${exam.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersToSubmit,
          totalTimeSeconds: totalTimeSpent,
        }),
      });

      if (!res.ok) throw new Error("Lỗi khi nộp bài thi.");
      const result = await res.json();
      setExamResult(result);

      if (result.isPassed && typeof window !== "undefined") {
        try {
          const confetti = (await import("canvas-confetti")).default;
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi nộp bài.");
    } finally {
      setIsSubmitting(false);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`cma_exam_draft_${exam.id}`);
        } catch (e) {}
        window.dispatchEvent(new CustomEvent("cma:progress_updated"));
      }
    }
  };

  const handleExitSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveExam(null);
    setExamQuestions([]);
    setExamResult(null);
    fetchMockList();
  };

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // SIMULATION MODE VIEW
  // -------------------------------------------------------------
  if (activeExam && examQuestions.length > 0) {
    const currentQ = examQuestions[currentIndex];
    const userChoice = userAnswers[currentQ?.id];
    const isFlagged = Boolean(flaggedQuestions[currentQ?.id]);
    const answeredCount = Object.keys(userAnswers).length;

    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Prometric Top Bar */}
        <div className="p-4 rounded-xl border border-border bg-slate-900 text-white shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-600 text-white font-mono">
              Prometric Exam Simulator
            </span>
            <span className="text-sm font-semibold truncate max-w-xs">{activeExam.name}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
              <Clock className="size-3.5" />
              <span>{formatTimer(secondsLeft)}</span>
            </div>

            {/* Flag */}
            <button
              onClick={toggleFlag}
              className={`p-1.5 rounded border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                isFlagged
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Flag className="size-3.5" />
              <span className="hidden sm:inline">Mark for Review</span>
            </button>

            {/* Palette */}
            <button
              onClick={() => setShowPalette(true)}
              className="p-1.5 px-2.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 cursor-pointer"
            >
              <span>{answeredCount} / {examQuestions.length}</span>
            </button>

            {/* End Exam CTA */}
            <Button
              size="xs"
              onClick={() => setShowSubmitConfirm(true)}
              className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
            >
              Nộp bài
            </Button>
          </div>
        </div>

        {/* Question Area */}
        <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3">
            <span className="font-bold text-ink-900 font-mono text-sm">
              Question {currentIndex + 1} of {examQuestions.length}
            </span>
            {currentQ?.section?.code && (
              <span>Section {currentQ.section.code}: {currentQ.section.title}</span>
            )}
          </div>

          {currentQ?.basisScenario && (
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-ink-800 whitespace-pre-line leading-relaxed">
              <strong className="block text-amber-900 mb-1">Fact Pattern:</strong>
              {currentQ.basisScenario}
            </div>
          )}

          <h3 className="text-base md:text-lg font-semibold text-ink-900 leading-relaxed whitespace-pre-line">
            {currentQ?.stem}
          </h3>

          {/* Choices */}
          <div className="space-y-3">
            {currentQ?.choices.map((c: any) => {
              const isSelected = userChoice === c.choiceKey;
              const isElim = (eliminatedChoices[currentQ.id] || []).includes(c.choiceKey);

              return (
                <div
                  key={c.choiceKey}
                  onClick={() => handleSelectChoice(c.choiceKey)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-brand-600 bg-brand-50/50 font-semibold shadow-xs"
                      : isElim
                      ? "border-dashed opacity-40 line-through"
                      : "border-border bg-card hover:border-brand-200 text-ink-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected ? "bg-brand-600 text-white" : "bg-muted text-ink-700"
                      }`}
                    >
                      {c.choiceKey}
                    </div>
                    <span className={`text-sm md:text-base ${isElim ? "line-through text-ink-400" : ""}`}>
                      {c.content}
                    </span>
                  </div>

                  <button
                    onClick={(e) => toggleEliminate(e, c.choiceKey)}
                    title="Gạch bỏ đáp án"
                    className="p-1 rounded text-ink-400 hover:text-ink-900"
                  >
                    <Strikethrough className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Nav Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
              className="gap-1.5"
            >
              <ChevronLeft className="size-4" />
              <span>Previous</span>
            </Button>

            <Button
              size="sm"
              disabled={currentIndex === examQuestions.length - 1}
              onClick={() => setCurrentIndex((p) => p + 1)}
              className="bg-brand-600 hover:bg-brand-500 text-white gap-1.5"
            >
              <span>Next</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Question Palette Modal */}
        <Dialog open={showPalette} onOpenChange={setShowPalette}>
          <DialogContent className="max-w-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-ink-900">
                Prometric Exam Navigator (100 Questions)
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-10 gap-2 py-4 max-h-[60vh] overflow-y-auto">
              {examQuestions.map((q, idx) => {
                const hasAnswer = Boolean(userAnswers[q.id]);
                const isCurrent = idx === currentIndex;
                const flagged = Boolean(flaggedQuestions[q.id]);

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowPalette(false);
                    }}
                    className={`relative p-2 rounded border text-xs font-bold font-mono transition-all cursor-pointer ${
                      isCurrent
                        ? "border-brand-600 bg-brand-600 text-white"
                        : hasAnswer
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-border bg-card text-ink-700 hover:bg-muted"
                    }`}
                  >
                    {idx + 1}
                    {flagged && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Submit Dialog */}
        <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
          <DialogContent className="max-w-md p-6 text-center space-y-4">
            <DialogTitle className="text-lg font-bold text-ink-900">
              Xác nhận nộp bài thi thử?
            </DialogTitle>
            <p className="text-xs text-ink-600 leading-relaxed">
              Bạn đã trả lời {answeredCount} / {examQuestions.length} câu. Còn{" "}
              {examQuestions.length - answeredCount} câu chưa trả lời. Thời gian còn lại:{" "}
              {formatTimer(secondsLeft)}.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                Tiếp tục làm bài
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="bg-brand-600 hover:bg-brand-500 text-white font-bold"
              >
                {isSubmitting ? "Đang chấm điểm..." : "Xác nhận nộp"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Exam Result Dialog */}
        <Dialog open={Boolean(examResult)} onOpenChange={() => {}}>
          <DialogContent className="max-w-md p-6 text-center space-y-5">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                examResult?.isPassed ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-brand-600"
              }`}
            >
              {examResult?.isPassed ? (
                <Award className="size-8 text-emerald-600" />
              ) : (
                <Clock className="size-8 text-brand-600" />
              )}
            </div>

            <div>
              <DialogTitle className="text-xl md:text-2xl font-bold text-ink-900">
                {examResult?.isPassed ? "CHÚC MỪNG: BẠN ĐÃ ĐẠT (PASS)!" : "KẾT QUẢ: CHƯA ĐẠT (FAIL)"}
              </DialogTitle>
              <p className="text-xs text-ink-500 mt-1">
                Điểm chuẩn đỗ CMA Part 2 của IMA là 360 / 500 điểm.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-ink-50 border border-ink-100 text-center">
              <div>
                <div className="text-[11px] text-ink-500 font-medium">Số câu đúng</div>
                <div className="text-2xl font-bold text-ink-900 font-mono mt-0.5">
                  {examResult?.score} / {examResult?.totalQuestions}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-ink-500 font-medium">IMA Scaled Score</div>
                <div
                  className={`text-2xl font-bold font-mono mt-0.5 ${
                    examResult?.isPassed ? "text-emerald-600" : "text-brand-600"
                  }`}
                >
                  {examResult?.scaledScore} / 500
                </div>
              </div>
            </div>

            <Button
              onClick={handleExitSimulation}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold"
            >
              Trở về danh sách đề thi
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MOCK EXAM CATALOG LIST VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="size-7 text-brand-600" />
            Thi thử chuẩn Prometric (Mock Exam)
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            31 đề thi 100 câu bấm giờ 180 phút mô phỏng chuẩn giao diện thi máy của IMA.
          </p>
        </div>
        <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-500 text-white">
          <Link href="/dashboard" className="gap-1.5">
            <span>Bảng điều khiển</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-ink-100 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockList.map((mock) => {
            const attempt = mock.latestAttempt;
            return (
              <div
                key={mock.id}
                className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3 hover:border-brand-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-mono">
                      {mock.id.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="size-3.5" />
                      {mock.durationMinutes} phút
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-ink-900">{mock.name}</h3>
                  <p className="text-xs text-ink-500">
                    {mock.questionCount} câu trắc nghiệm tổng hợp 6 phần A–F theo chuẩn đề thi IMA.
                  </p>

                  {attempt && (
                    <div className="p-2.5 rounded-lg bg-ink-50 border border-ink-100 flex items-center justify-between text-xs">
                      <span className="text-ink-600">Lần thi gần nhất:</span>
                      <span
                        className={`font-bold font-mono ${
                          attempt.isPassed ? "text-emerald-700" : "text-brand-700"
                        }`}
                      >
                        {attempt.scaledScore}/500 ({attempt.isPassed ? "PASS" : "FAIL"})
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border">
                  <Button
                    onClick={() => handleStartExam(mock.id)}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold cursor-pointer gap-2"
                  >
                    <span>{attempt ? "Thi lại đề này" : "Bắt đầu thi thử"}</span>
                    <Play className="size-3.5 fill-white" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
