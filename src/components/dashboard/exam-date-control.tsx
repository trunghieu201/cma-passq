"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Edit3 } from "lucide-react";
import { ExamDateModal } from "./exam-date-modal";

interface ExamPlan {
  targetExamDate: string;
  examDateFormatted: string;
  daysRemaining: number;
  weeklyHours: number;
  studyMode: string;
  targetScore: number;
}

interface ExamDateControlProps {
  examPlan: ExamPlan;
  statusIndicator: string;
  isAhead: boolean;
  onPlanUpdated: () => void;
}

export function ExamDateControl({
  examPlan,
  statusIndicator,
  isAhead,
  onPlanUpdated,
}: ExamDateControlProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card className="h-full border-border shadow-sm hover:border-brand-300 transition-all duration-200">
        <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-500 flex items-center gap-1.5">
                <Target className="size-3.5 text-brand-600" />
                Mục tiêu kỳ thi
              </span>
              <span className="text-xs font-semibold text-ink-800">
                Kỳ thi: {examPlan.examDateFormatted}
              </span>
            </div>

            {/* Countdown Days */}
            <div className="my-3">
              <div
                data-testid="exam-countdown"
                className="text-3xl md:text-4xl font-extrabold text-brand-600 font-mono tracking-tight"
              >
                Còn {examPlan.daysRemaining} ngày
              </div>
              <p className="text-xs text-ink-500 mt-1">
                Kỳ thi CMA Part 2 (Chiến lược & Quản trị tài chính)
              </p>
            </div>

            {/* Status Indicator Badge */}
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isAhead
                    ? "bg-[#e3f5ea] text-[#12a150] border-[#12a150]/20"
                    : "bg-[#fff4dc] text-[#a36a0a] border-[#a36a0a]/20"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isAhead ? "bg-[#12a150]" : "bg-[#a36a0a]"
                  }`}
                />
                Trạng thái: {statusIndicator}
              </span>
            </div>
          </div>

          {/* Trigger to Update Date Modal */}
          <div className="mt-5 pt-3 border-t border-ink-100 flex items-center justify-between">
            <span className="text-xs text-ink-600">
              Cam kết: <strong>{examPlan.weeklyHours} giờ/tuần</strong> · Điểm: <strong>{examPlan.targetScore}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="change-exam-date-button"
              onClick={() => setModalOpen(true)}
              className="text-xs font-semibold text-ink-800 gap-1.5 cursor-pointer"
            >
              <Edit3 className="size-3.5" />
              Đổi ngày thi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for Updating Plan */}
      <ExamDateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentPlan={examPlan}
        onSuccess={onPlanUpdated}
      />
    </>
  );
}
