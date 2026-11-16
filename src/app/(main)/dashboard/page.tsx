"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KpiStatsGrid } from "@/components/dashboard/kpi-stats-grid";
import { ContinueLearningCard } from "@/components/dashboard/continue-learning-card";
import { ExamDateControl } from "@/components/dashboard/exam-date-control";
import { StudyHoursChart } from "@/components/dashboard/study-hours-chart";
import { DailyTodoCard } from "@/components/dashboard/daily-todo-card";
import { MethodologyGuideCard } from "@/components/dashboard/methodology-guide-card";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = React.useRef(data);
  dataRef.current = data;

  // Load cached stats on mount for instant zero-latency render
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("cma_dashboard_stats");
        if (cached) {
          const parsed = JSON.parse(cached);
          setData(parsed);
          setIsLoading(false);
        }
      } catch (e) {}
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/user/stats");
      if (!res.ok) {
        throw new Error("Không thể tải dữ liệu thống kê.");
      }
      const json = await res.json();
      setData(json);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("cma_dashboard_stats", JSON.stringify(json));
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
    fetchStats();

    let lastFocus = Date.now();
    const handleProgressUpdate = () => {
      fetchStats();
    };
    const handleFocus = () => {
      // Debounce window focus events to prevent rapid cascade refetches
      if (Date.now() - lastFocus > 5000) {
        lastFocus = Date.now();
        fetchStats();
      }
    };

    window.addEventListener("cma:progress_updated", handleProgressUpdate);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("cma:progress_updated", handleProgressUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-ink-200 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-ink-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-7 h-52 bg-ink-200 rounded-xl" />
          <div className="md:col-span-5 h-52 bg-ink-200 rounded-xl" />
        </div>
        <div className="h-72 bg-ink-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-6 h-60 bg-ink-200 rounded-xl" />
          <div className="md:col-span-6 h-60 bg-ink-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-brand-600 font-semibold mb-3">
          {error || "Không tìm thấy dữ liệu."}
        </p>
        <Button onClick={fetchStats} variant="outline" size="sm" className="gap-2 cursor-pointer">
          <RefreshCcw className="size-4" />
          Thử lại
        </Button>
      </div>
    );
  }

  const { stats, examPlan, activeNode, dailyTodos, chartData } = data;

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <DashboardHeader />

      {/* 2. KPI Metrics Strip */}
      <KpiStatsGrid
        totalAnswered={stats.totalQuestionsAnswered}
        correctRate={stats.correctRate}
        studyHours={stats.studyHoursActual}
        currentStreak={stats.currentStreak}
        targetScore={stats.targetScore}
      />

      {/* 3. Hero Section: Card 1 (Continue Learning) & Card 2 (Exam Countdown) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-7">
          <ContinueLearningCard activeNode={activeNode} />
        </div>
        <div className="md:col-span-5">
          <ExamDateControl
            examPlan={examPlan}
            statusIndicator={stats.statusIndicator}
            isAhead={stats.studyHoursDelta >= 0}
            onPlanUpdated={fetchStats}
          />
        </div>
      </div>

      {/* 4. Card 3: Dual Curve Cumulative Study Hours SVG Chart */}
      <div>
        <StudyHoursChart
          data={chartData}
          thisWeekHours={stats.thisWeekHours}
          thisWeekTarget={stats.thisWeekTargetHours}
          averageSpeed={stats.averageSpeedMinPerQ}
          statusMessage={stats.statusIndicator}
        />
      </div>

      {/* 5. Bottom Section: Card 4 (Daily To-Do) & Card 5 (4-Step Methodology Guide) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-6">
          <DailyTodoCard
            dueFlashcards={dailyTodos.dueFlashcardsCount}
            practiceQuestionsGoal={dailyTodos.practiceQuestionsGoal}
            weaknessQuestions={dailyTodos.weaknessQuestionsCount}
            activeUnitTitle={activeNode?.unitTitle}
            activeUnitId={activeNode?.id}
          />
        </div>
        <div className="md:col-span-6">
          <MethodologyGuideCard />
        </div>
      </div>
    </div>
  );
}
