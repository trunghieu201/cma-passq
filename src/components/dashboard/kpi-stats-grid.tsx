import React from "react";
import { CheckCircle2, Target, Clock, Flame, Trophy } from "lucide-react";

interface KpiStatsGridProps {
  totalAnswered: number;
  correctRate: number;
  studyHours: number;
  currentStreak: number;
  targetScore: number;
}

export function KpiStatsGrid({
  totalAnswered,
  correctRate,
  studyHours,
  currentStreak,
  targetScore,
}: KpiStatsGridProps) {
  const kpis = [
    {
      label: "Câu hỏi đã làm",
      val: `${totalAnswered.toLocaleString()} câu`,
      icon: CheckCircle2,
      color: "text-blue-600",
      testId: "stat-total-answered",
    },
    {
      label: "Tỷ lệ đúng",
      val: `${correctRate}%`,
      icon: Target,
      color: "text-emerald-600",
      testId: "stat-accuracy",
    },
    {
      label: "Thời gian đã học",
      val: `${studyHours.toFixed(1)} giờ`,
      icon: Clock,
      color: "text-brand-600",
      testId: "stat-study-hours",
    },
    {
      label: "Chuỗi ngày học",
      val: `${currentStreak} ngày 🔥`,
      icon: Flame,
      color: "text-amber-500",
      testId: "stat-current-streak",
    },
    {
      label: "Điểm mục tiêu",
      val: `${targetScore} / 500`,
      icon: Trophy,
      color: "text-purple-600",
      testId: "stat-target-score",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            data-testid={kpi.testId}
            className="bg-card border border-border rounded-xl p-3.5 shadow-sm hover:border-brand-200 transition-colors"
          >
            <div className="flex items-center justify-between text-ink-500 mb-1">
              <span className="text-xs font-medium">{kpi.label}</span>
              <Icon className={`size-4 ${kpi.color}`} />
            </div>
            <div className="text-lg md:text-xl font-bold text-ink-900 font-mono">
              {kpi.val}
            </div>
          </div>
        );
      })}
    </div>
  );
}
