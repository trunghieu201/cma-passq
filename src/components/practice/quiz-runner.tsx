"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  Strikethrough,
  XCircle,
  Layers,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ChoiceItem {
  id: string;
  choiceKey: string;
  content: string;
  isCorrect?: boolean;
  distractorAnalysis?: string | null;
}

export interface QuestionItem {
  id: string;
  stem: string;
  basisScenario?: string | null;
  correctChoice: string;
  explanation: string;
  citation?: string | null;
  questionType?: number;
  subunit?: { id?: string; code: string; title: string };
  unit?: { unitNumber: number; title: string };
  section?: { code: string; title: string };
  choices: ChoiceItem[];
}

interface QuizRunnerProps {
  questions: QuestionItem[];
  title?: string;
  subunitId?: string;
  onExit: () => void;
}

export function QuizRunner({
  questions,
  title = "Luyện tập câu hỏi trắc nghiệm",
  subunitId,
  onExit,
}: QuizRunnerProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [eliminatedChoices, setEliminatedChoices] = useState<Record<string, string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});
  
  // Mode: "instant" (chế độ học - xem giải thích ngay) vs "exam" (chế độ thi - nộp cuối bài)
  const [learningMode, setLearningMode] = useState<"instant" | "exam">("instant");
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  // Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Result dialog
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Formula helper modal
  const [showFormulaHelper, setShowFormulaHelper] = useState(false);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);

  // Session ID from API
  const [sessionId, setSessionId] = useState<string | null>(null);

  const selectedAnswersRef = useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;
  const secondsElapsedRef = useRef(secondsElapsed);
  secondsElapsedRef.current = secondsElapsed;

  // Start timer & Quiz session
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    // Initialize backend QuizSession
    async function initSession() {
      try {
        const res = await fetch("/api/quiz/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: subunitId ? "SUBUNIT_PRACTICE" : "PRACTICE",
            title,
            totalQuestions: questions.length,
            filterScope: subunitId ? { subunitId } : null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSessionId(data.sessionId);
        }
      } catch (err) {
        // Continue locally
      }
    }

    if (questions.length > 0) {
      initSession();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questions.length, subunitId, title]);

  const currentQ = questions[currentIndex];
  const storageDraftKey = `cma_quiz_draft_${subunitId || "practice"}`;

  // Restore draft and bookmarks on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(storageDraftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedAnswers) setSelectedAnswers(parsed.selectedAnswers);
        if (parsed.eliminatedChoices) setEliminatedChoices(parsed.eliminatedChoices);
        if (parsed.flaggedQuestions) setFlaggedQuestions(parsed.flaggedQuestions);
        if (parsed.revealedExplanations) setRevealedExplanations(parsed.revealedExplanations);
        if (typeof parsed.secondsElapsed === "number") setSecondsElapsed(parsed.secondsElapsed);
      }
      fetch("/api/bookmarks")
        .then((r) => r.json())
        .then((data) => {
          if (data && data.bookmarks) {
            const bmMap: Record<string, boolean> = {};
            data.bookmarks.forEach((b: any) => {
              if (b.question?.id) bmMap[b.question.id] = true;
            });
            setBookmarkedQuestions((prev) => ({ ...bmMap, ...prev }));
          }
        })
        .catch(() => {});
    } catch (e) {
      // Ignore local storage error
    }
  }, [storageDraftKey]);

  // Auto-save draft on state change
  useEffect(() => {
    if (typeof window === "undefined" || isFinished) return;
    if (Object.keys(selectedAnswers).length === 0) return;
    try {
      localStorage.setItem(
        storageDraftKey,
        JSON.stringify({
          selectedAnswers,
          eliminatedChoices,
          flaggedQuestions,
          revealedExplanations,
          secondsElapsed,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      // Ignore
    }
  }, [selectedAnswers, eliminatedChoices, flaggedQuestions, revealedExplanations, secondsElapsed, isFinished, storageDraftKey]);

  const handleSelectChoice = (choiceKey: string) => {
    if (!currentQ) return;
    // If explanation already revealed in instant mode, allow re-selecting or lock
    if (learningMode === "instant" && revealedExplanations[currentQ.id]) {
      return;
    }

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: choiceKey,
    }));

    // Auto un-eliminate if user decides to select this choice
    setEliminatedChoices((prev) => {
      const currentList = prev[currentQ.id] || [];
      if (currentList.includes(choiceKey)) {
        return { ...prev, [currentQ.id]: currentList.filter((k) => k !== choiceKey) };
      }
      return prev;
    });
  };

  const toggleEliminateKey = (choiceKey: string) => {
    if (!currentQ) return;
    const isCurrentlyEliminated = (eliminatedChoices[currentQ.id] || []).includes(choiceKey);
    setEliminatedChoices((prev) => {
      const currentList = prev[currentQ.id] || [];
      const updated = isCurrentlyEliminated
        ? currentList.filter((k) => k !== choiceKey)
        : [...currentList, choiceKey];
      return { ...prev, [currentQ.id]: updated };
    });

    // If striking out the answer that was currently selected, deselect it
    if (!isCurrentlyEliminated) {
      setSelectedAnswers((prev) => {
        if (prev[currentQ.id] === choiceKey) {
          const updated = { ...prev };
          delete updated[currentQ.id];
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
    if (!currentQ) return;
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const toggleBookmark = async () => {
    if (!currentQ) return;
    const isBookmarked = bookmarkedQuestions[currentQ.id];
    setBookmarkedQuestions((prev) => ({
      ...prev,
      [currentQ.id]: !isBookmarked,
    }));

    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQ.id }),
      });
      if (res.ok && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cma:bookmark_updated", {
            detail: { questionId: currentQ.id, bookmarked: !isBookmarked },
          })
        );
      }
    } catch (err) {
      // Revert if error
      setBookmarkedQuestions((prev) => ({
        ...prev,
        [currentQ.id]: isBookmarked,
      }));
    }
  };

  const handleCheckAnswer = async () => {
    if (!currentQ) return;
    const selected = selectedAnswers[currentQ.id];
    if (!selected) return;

    setRevealedExplanations((prev) => ({
      ...prev,
      [currentQ.id]: true,
    }));

    // Record answer to backend
    try {
      await fetch("/api/quiz/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQ.id,
          selectedChoice: selected,
          isFlagged: Boolean(flaggedQuestions[currentQ.id]),
          eliminatedKeys: eliminatedChoices[currentQ.id] || [],
          timeSpentMs: 10000,
        }),
      });
    } catch (err) {
      // Silent catch
    }
  };

  const handleFinishQuiz = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSubmitting(true);

    const currentAnswers = selectedAnswersRef.current;
    const currentElapsed = secondsElapsedRef.current;

    let correctCount = 0;
    const answersPayload = questions.map((q) => {
      const selected = currentAnswers[q.id] || null;
      const isCorrect = selected === q.correctChoice;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        selectedChoice: selected,
        isCorrect,
      };
    });

    const accuracyPct =
      questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    try {
      const res = await fetch("/api/quiz/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          subunitId,
          timeSpentSec: currentElapsed,
          answers: answersPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuizResult(data);
      } else {
        setQuizResult({
          totalAnswered: questions.length,
          correctCount,
          accuracyPct,
          timeSpentSec: currentElapsed,
        });
      }
    } catch (err) {
      setQuizResult({
        totalAnswered: questions.length,
        correctCount,
        accuracyPct,
        timeSpentSec: currentElapsed,
      });
    } finally {
      setIsSubmitting(false);
      setIsFinished(true);

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(storageDraftKey);
        } catch (e) {}
        window.dispatchEvent(new CustomEvent("cma:progress_updated"));

        if (accuracyPct >= 80) {
          try {
            const confetti = (await import("canvas-confetti")).default;
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch (e) {
            // Ignore
          }
        }
      }
    }
  }, [questions, selectedAnswers, sessionId, subunitId, secondsElapsed]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (!currentQ) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-border">
        <p className="text-sm text-ink-600">Không có câu hỏi nào để hiển thị.</p>
        <Button onClick={onExit} variant="outline" size="sm" className="mt-3">
          Quay lại
        </Button>
      </div>
    );
  }

  const userChoice = currentQ ? selectedAnswers[currentQ.id] : undefined;
  const isRevealed = currentQ ? Boolean(revealedExplanations[currentQ.id]) : false;
  const isEliminated = (key: string) =>
    currentQ ? (eliminatedChoices[currentQ.id] || []).includes(key) : false;
  const isFlagged = currentQ ? Boolean(flaggedQuestions[currentQ.id]) : false;
  const isBookmarked = currentQ ? Boolean(bookmarkedQuestions[currentQ.id]) : false;

  // Global Keyboard Navigation (A/B/C/D or 1/2/3/4, Enter/Space, S, F, M, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      if (showFormulaHelper || showQuestionPalette || isFinished) return;

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
        const choiceToEliminate = userChoice || "A";
        toggleEliminateKey(choiceToEliminate);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (learningMode === "instant" && !isRevealed) {
          if (userChoice) {
            handleCheckAnswer();
          }
        } else {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          } else {
            handleFinishQuiz();
          }
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (key === "F") {
        e.preventDefault();
        toggleFlag();
      } else if (key === "M") {
        e.preventDefault();
        toggleBookmark();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentQ,
    userChoice,
    learningMode,
    isRevealed,
    currentIndex,
    questions.length,
    showFormulaHelper,
    showQuestionPalette,
    isFinished,
    handleFinishQuiz,
  ]);

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* 1. Header Bar: Navigation, Question Counter, Timer, Mode Toggle */}
      <div className="p-3.5 md:p-4 rounded-xl border border-border bg-card shadow-xs flex flex-wrap items-center justify-between gap-3">
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
            Câu {currentIndex + 1} / {questions.length}
          </span>
          {currentQ.subunit?.code && (
            <span className="hidden sm:inline-block text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              Chương {currentQ.subunit.code}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setLearningMode("instant")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                learningMode === "instant"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              Học tập
            </button>
            <button
              type="button"
              onClick={() => setLearningMode("exam")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                learningMode === "exam"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              Kiểm tra
            </button>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ink-50 border border-ink-100 text-ink-700 text-xs font-mono font-bold">
            <Clock className="size-3.5 text-brand-600" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Quick Palette Trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowQuestionPalette(true)}
            className="text-xs gap-1.5 text-ink-700 cursor-pointer"
          >
            <Layers className="size-3.5" />
            <span className="hidden sm:inline">Danh sách</span>
            <span className="font-mono text-brand-600">({answeredCount}/{questions.length})</span>
          </Button>

          {/* Flag Button */}
          <button
            type="button"
            onClick={toggleFlag}
            title="Đánh dấu câu hỏi"
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isFlagged
                ? "bg-amber-50 border-amber-300 text-amber-600"
                : "border-border hover:bg-muted text-ink-500"
            }`}
          >
            <Flag className="size-4" />
          </button>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={toggleBookmark}
            title="Lưu câu hỏi"
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isBookmarked
                ? "bg-brand-50 border-brand-300 text-brand-600"
                : "border-border hover:bg-muted text-ink-500"
            }`}
          >
            <Bookmark className="size-4" />
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* 2. Main Question Card */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-7 shadow-sm space-y-6">
        {/* Basis Scenario if present */}
        {currentQ.basisScenario && (
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs md:text-sm text-ink-800 leading-relaxed font-sans space-y-1">
            <span className="font-bold text-amber-900 block uppercase tracking-wider text-[11px]">
              Dữ liệu tình huống chung (Fact Pattern):
            </span>
            <div className="whitespace-pre-line">{currentQ.basisScenario}</div>
          </div>
        )}

        {/* Question Stem */}
        <div>
          {currentQ.citation && (
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Nguồn: {currentQ.citation}
            </div>
          )}
          <h3 className="text-base md:text-lg font-semibold text-ink-900 leading-relaxed whitespace-pre-line">
            {currentQ.stem}
          </h3>
        </div>

        {/* 3. Choices (A, B, C, D) */}
        <div className="space-y-3">
          {currentQ.choices.map((choice) => {
            const isSelected = userChoice === choice.choiceKey;
            const eliminated = isEliminated(choice.choiceKey);
            const isCorrectAnswer = choice.choiceKey === currentQ.correctChoice;

            // Highlight color logic
            let containerStyle = "border-border bg-card hover:border-brand-300 text-ink-900";
            let pillStyle = "bg-muted text-ink-700";

            if (learningMode === "instant" && isRevealed) {
              if (isCorrectAnswer) {
                containerStyle = "border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold";
                pillStyle = "bg-emerald-600 text-white font-bold";
              } else if (isSelected && !isCorrectAnswer) {
                containerStyle = "border-red-500 bg-red-50/60 text-red-950";
                pillStyle = "bg-red-600 text-white font-bold";
              } else {
                containerStyle = "border-border bg-muted/20 opacity-60";
              }
            } else if (isSelected) {
              containerStyle = "border-brand-600 bg-brand-50/50 shadow-xs ring-1 ring-brand-400 font-semibold";
              pillStyle = "bg-brand-600 text-white font-bold";
            } else if (eliminated) {
              containerStyle = "border-dashed border-ink-200 bg-muted/20 opacity-40 line-through text-ink-400";
            }

            return (
              <div
                key={choice.choiceKey}
                onClick={() => handleSelectChoice(choice.choiceKey)}
                className={`p-3.5 md:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${containerStyle}`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${pillStyle}`}
                  >
                    {choice.choiceKey}
                  </div>
                  <span className={`text-sm md:text-base leading-snug break-words ${eliminated ? "line-through text-ink-400" : ""}`}>
                    {choice.content}
                  </span>
                </div>

                {/* Strikethrough / Elimination Tool */}
                <button
                  type="button"
                  title="Gạch bỏ đáp án loại trừ"
                  onClick={(e) => toggleEliminate(e, choice.choiceKey)}
                  className={`p-1.5 rounded-lg border hover:bg-muted transition-colors shrink-0 cursor-pointer ${
                    eliminated
                      ? "bg-ink-200 text-ink-800 border-ink-300"
                      : "text-ink-400 border-transparent hover:border-ink-200"
                  }`}
                >
                  <Strikethrough className="size-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 4. Instant Pedagogical Explanation & Distractor Analysis */}
        {learningMode === "instant" && isRevealed && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-5 space-y-4 animate-in fade-in duration-200">
            {/* Correct/Incorrect Banner */}
            <div className="flex items-center gap-2.5">
              {userChoice === currentQ.correctChoice ? (
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <span>Chính xác! Đáp án đúng là {currentQ.correctChoice}.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-brand-700 font-bold text-sm">
                  <XCircle className="size-5 text-brand-600" />
                  <span>Chưa chính xác. Đáp án đúng là {currentQ.correctChoice}.</span>
                </div>
              )}
            </div>

            {/* Step-by-Step Pedagogical Explanation */}
            <div className="text-xs md:text-sm text-ink-800 leading-relaxed space-y-2">
              <div className="font-bold text-ink-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Sparkles className="size-3.5 text-brand-600" />
                Giải thích chi tiết theo từng bước:
              </div>
              <div className="whitespace-pre-line bg-card p-3.5 rounded-lg border border-border">
                {currentQ.explanation}
              </div>
            </div>

            {/* Distractor Analyses Accordion / List */}
            <div className="space-y-2 pt-2 border-t border-brand-100">
              <span className="text-xs font-bold text-brand-900 uppercase tracking-wider block">
                Phân tích bẫy các đáp án sai (Distractor Analysis):
              </span>
              <div className="space-y-2">
                {currentQ.choices.map((c) => (
                  <div
                    key={c.choiceKey}
                    className={`p-3 rounded-lg text-xs leading-relaxed border ${
                      c.choiceKey === currentQ.correctChoice
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                        : "bg-card border-border text-ink-700"
                    }`}
                  >
                    <span className="font-bold mr-1.5">
                      Đáp án ({c.choiceKey}):
                    </span>
                    {c.distractorAnalysis ||
                      (c.choiceKey === currentQ.correctChoice
                        ? "Đây là câu trả lời chính xác theo nguyên tắc lý thuyết và chuẩn mực IMA."
                        : "Lựa chọn này vi phạm công thức hoặc điều kiện tiền đề trong đề bài.")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. Bottom Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="text-ink-700 cursor-pointer"
            >
              <ArrowLeft className="size-4 mr-1" />
              Câu trước
            </Button>

            {learningMode === "instant" && !isRevealed && (
              <Button
                type="button"
                disabled={!userChoice}
                onClick={handleCheckAnswer}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs cursor-pointer"
              >
                Kiểm tra đáp án
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentIndex < questions.length - 1 ? (
              <Button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs cursor-pointer gap-1.5"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinishQuiz}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer gap-1.5"
              >
                <span>Nộp bài & Hoàn thành</span>
                <CheckCircle2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Keyboard shortcut guide */}
        <div className="hidden sm:flex items-center justify-center gap-3 text-[11px] text-ink-600 bg-muted/40 py-2 px-3 rounded-lg border border-border/50">
          <span className="font-semibold text-ink-800">Phím tắt:</span>
          <span><kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono font-bold text-ink-800">A/B/C/D</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono font-bold text-ink-800">1-4</kbd> Chọn</span>
          <span><kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono font-bold text-ink-800">Enter / Space</kbd> Tiếp / Xem lời giải</span>
          <span><kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono font-bold text-ink-800">S</kbd> Gạch loại trừ</span>
          <span><kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono font-bold text-ink-800">F</kbd> Cờ</span>
          <span><kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono font-bold text-ink-800">M</kbd> Lưu</span>
        </div>
      </div>

      {/* Question Palette Modal */}
      <Dialog open={showQuestionPalette} onOpenChange={setShowQuestionPalette}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-ink-900">
              Bảng danh sách câu hỏi ({questions.length} câu)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-5 gap-2.5 py-4 max-h-[60vh] overflow-y-auto">
            {questions.map((q, idx) => {
              const hasAnswer = Boolean(selectedAnswers[q.id]);
              const isCurrent = idx === currentIndex;
              const flagged = Boolean(flaggedQuestions[q.id]);

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowQuestionPalette(false);
                  }}
                  className={`relative p-2.5 rounded-lg border text-xs font-bold font-mono transition-all cursor-pointer ${
                    isCurrent
                      ? "border-brand-600 bg-brand-600 text-white shadow-xs"
                      : hasAnswer
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-border bg-card text-ink-700 hover:bg-muted"
                  }`}
                >
                  {idx + 1}
                  {flagged && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink-500 pt-2 border-t border-border">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-300" /> Đã trả lời
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Đánh dấu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-brand-600" /> Đang xem
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Modal */}
      <Dialog open={isFinished} onOpenChange={() => {}}>
        <DialogContent className="max-w-md p-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-8 text-brand-600" />
          </div>

          <div>
            <DialogTitle className="text-xl md:text-2xl font-bold text-ink-900">
              Hoàn thành bài luyện tập!
            </DialogTitle>
            <p className="text-xs text-ink-500 mt-1">
              Hệ thống đã lưu kết quả vào tiến độ học tập và đồng bộ vào lộ trình.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 p-4 rounded-xl bg-ink-50 border border-ink-100 text-center">
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Số câu đúng</div>
              <div className="text-xl font-bold text-ink-900 font-mono mt-0.5">
                {quizResult?.correctCount || 0} / {questions.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Độ chính xác</div>
              <div className="text-xl font-bold text-brand-600 font-mono mt-0.5">
                {quizResult?.accuracyPct || 0}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Thời gian</div>
              <div className="text-xl font-bold text-ink-900 font-mono mt-0.5">
                {formatTimer(secondsElapsed)}
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
              <Link href="/lo-trinh">Xem Lộ trình học</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
