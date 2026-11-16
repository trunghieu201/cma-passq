"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, BookOpen } from "lucide-react";
import { useLayout } from "./layout-context";

export function PlanPicker() {
  const { selectedCourse, setSelectedCourse } = useLayout();

  const COURSES = [
    {
      id: "CMA_P2",
      title: "CMA Part 2",
      subtitle: "Quản trị Tài chính Chiến lược",
      status: "active",
      badge: "Đang học",
      questions: "7,609 câu",
    },
    {
      id: "CMA_P1",
      title: "CMA Part 1",
      subtitle: "Báo cáo & Kế hoạch Tài chính",
      status: "coming_soon",
      badge: "Sắp ra mắt",
      questions: "Dự kiến 2027",
    },
    {
      id: "ACCA_MA",
      title: "ACCA Môn MA",
      subtitle: "Management Accounting",
      status: "partner",
      badge: "Môn đối tác",
      questions: "PassQ VN",
    },
  ];

  const currentCourse =
    COURSES.find((c) => c.id === selectedCourse) || COURSES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="subject-switcher"
        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-left transition focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-ink-900 truncate">
                {currentCourse.title}
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-brand-100 text-brand-700">
                {currentCourse.badge}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              {currentCourse.subtitle}
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-68 p-1.5" align="start">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
          Chọn lộ trình môn học
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {COURSES.map((course) => {
          const isSelected = course.id === currentCourse.id;
          return (
            <DropdownMenuItem
              key={course.id}
              onClick={() => {
                if (course.status === "active") {
                  setSelectedCourse(course.id);
                }
              }}
              disabled={course.status !== "active"}
              className="flex items-center justify-between p-2 rounded-lg cursor-pointer"
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{course.title}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${
                      course.status === "active"
                        ? "bg-brand-50 text-brand-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {course.badge}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {course.subtitle} · {course.questions}
                </span>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 text-brand-600 shrink-0 ml-2" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
