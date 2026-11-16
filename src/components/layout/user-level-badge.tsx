"use client";

import React from "react";
import { getUserRank } from "@/lib/user-rank";
import { Award } from "lucide-react";

export function UserLevelBadge({
  totalAnswered = 0,
}: {
  totalAnswered?: number;
}) {
  const rank = getUserRank(totalAnswered);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between text-[11px]">
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border ${rank.badgeBg} ${rank.badgeText} ${rank.badgeBorder}`}
        >
          <Award className="w-3 h-3" />
          <span>
            Lv.{rank.level} · {rank.name}
          </span>
        </div>
        <span className="text-muted-foreground font-medium">
          {rank.currentCount}/{rank.maxQuestions} câu
        </span>
      </div>

      {/* Mini Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(3, rank.progressInTier)}%` }}
        />
      </div>
    </div>
  );
}
