"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Compass,
  ChevronDown,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  Sparkles,
  Search,
  Filter,
  Award,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubunitDetailModal, SubunitData } from "./subunit-detail-modal";

interface SubunitItem {
  id: string;
  code: string;
  subunitNum: number;
  title: string;
  questionCount: number;
  status: string;
  stars: number;
  accuracyPct: number;
  attemptsCount: number;
  categories: any[];
}

interface UnitItem {
  id: string;
  sectionId: string;
  unitNumber: number;
  code: string;
  title: string;
  questionCount: number;
  completedSubunits: number;
  totalSubunits: number;
  subunits: SubunitItem[];
}

interface SectionItem {
  id: string;
  code: string;
  title: string;
  weight: number;
  orderIndex: number;
  description: string | null;
  totalQuestions: number;
  totalUnits: number;
  completedSubunits: number;
  units: UnitItem[];
}

export function RoadmapTree() {
  const searchParams = useSearchParams();
  const initialActiveNode = searchParams.get("activeNode");

  const [curriculum, setCurriculum] = useState<SectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // Subunit Detail Modal state
  const [selectedSubunit, setSelectedSubunit] = useState<SubunitData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadCurriculum() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/curriculum/tree");
        if (!res.ok) throw new Error("Không thể tải cấu trúc lộ trình.");
        const data = await res.json();
        setCurriculum(data.sections || []);

        // By default, expand unit 1 or the unit containing activeNode
        const initialExpanded: Record<string, boolean> = {};
        if (data.sections && data.sections.length > 0) {
          for (const sec of data.sections) {
            for (const u of sec.units) {
              if (
                initialActiveNode &&
                u.subunits.some((su: any) => su.id === initialActiveNode)
              ) {
                initialExpanded[u.id] = true;
                setSelectedSection(sec.code);
              } else if (u.unitNumber === 1) {
                initialExpanded[u.id] = true;
              }
            }
          }
        }
        setExpandedUnits(initialExpanded);
      } catch (err: any) {
        setError(err.message || "Đã có lỗi xảy ra.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCurriculum();

    let lastFocus = Date.now();
    const handleProgressUpdate = () => {
      loadCurriculum();
    };
    const handleFocus = () => {
      if (Date.now() - lastFocus > 5000) {
        lastFocus = Date.now();
        loadCurriculum();
      }
    };

    window.addEventListener("cma:progress_updated", handleProgressUpdate);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("cma:progress_updated", handleProgressUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, [initialActiveNode]);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  const handleOpenSubunitModal = (
    subunit: SubunitItem,
    unit: UnitItem,
    section: SectionItem
  ) => {
    setSelectedSubunit({
      id: subunit.id,
      code: subunit.code,
      title: subunit.title,
      questionCount: subunit.questionCount,
      unit: {
        number: unit.unitNumber,
        title: unit.title,
      },
      section: {
        code: section.code,
        title: section.title,
        weight: section.weight,
      },
      categories: subunit.categories,
      progress: {
        status: subunit.status,
        stars: subunit.stars,
        accuracyPct: subunit.accuracyPct,
        attemptsCount: subunit.attemptsCount,
      },
    });
    setIsModalOpen(true);
  };

  // Filter sections and units
  const filteredSections = useMemo(() => {
    return curriculum
      .filter((sec) => selectedSection === "ALL" || sec.code === selectedSection)
      .map((sec) => {
        const filteredUnits = sec.units
          .map((unit) => {
            let matchingSubunits = unit.subunits;

            if (statusFilter !== "ALL") {
              matchingSubunits = matchingSubunits.filter((su) => {
                if (statusFilter === "completed") {
                  return su.status === "completed" || su.status === "mastered";
                }
                if (statusFilter === "in_progress") {
                  return su.status === "in_progress" || (su.attemptsCount > 0 && su.status !== "completed" && su.status !== "mastered");
                }
                if (statusFilter === "not_started") {
                  return su.status !== "completed" && su.status !== "mastered" && su.status !== "in_progress" && su.attemptsCount === 0;
                }
                return true;
              });
            }

            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              const matchesUnit =
                unit.title.toLowerCase().includes(q) ||
                unit.code.toLowerCase().includes(q);
              const searchFiltered = matchingSubunits.filter(
                (su) =>
                  su.title.toLowerCase().includes(q) ||
                  su.code.toLowerCase().includes(q)
              );
              if (matchesUnit || searchFiltered.length > 0) {
                return {
                  ...unit,
                  subunits: searchFiltered.length > 0 ? searchFiltered : matchingSubunits,
                };
              }
              return null;
            }

            if (matchingSubunits.length > 0) {
              return {
                ...unit,
                subunits: matchingSubunits,
              };
            }
            return null;
          })
          .filter(Boolean) as UnitItem[];

        return {
          ...sec,
          units: filteredUnits,
        };
      })
      .filter((sec) => sec.units.length > 0);
  }, [curriculum, selectedSection, searchQuery, statusFilter]);

  // Overall stats
  const totalSubunitsCount = useMemo(() => {
    return curriculum.reduce(
      (sum, s) => sum + s.units.reduce((uSum, u) => uSum + u.subunits.length, 0),
      0
    );
  }, [curriculum]);

  const completedSubunitsCount = useMemo(() => {
    return curriculum.reduce(
      (sum, s) =>
        sum +
        s.units.reduce(
          (uSum, u) =>
            uSum +
            u.subunits.filter(
              (su) => su.status === "completed" || su.status === "mastered"
            ).length,
          0
        ),
      0
    );
  }, [curriculum]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-ink-100 rounded-xl w-full" />
        <div className="h-32 bg-ink-100 rounded-xl w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-ink-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-border">
        <p className="text-brand-600 font-semibold mb-2">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
        >
          Tải lại trang
        </Button>
      </div>
    );
  }

  const completionPct =
    totalSubunitsCount > 0
      ? Math.round((completedSubunitsCount / totalSubunitsCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Strip */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                IMA CMA Part 2
              </span>
              <span className="text-xs font-semibold text-ink-600">
                6 Phần · 15 Unit · {totalSubunitsCount} Chương học
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-ink-900 mt-1">
              Khung năng lực CMA Part 2: Strategic Financial Management
            </h2>
          </div>

          <div className="flex items-center gap-4 bg-ink-50 px-4 py-2.5 rounded-xl border border-ink-100">
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Tiến độ hoàn thành</div>
              <div className="text-lg font-bold text-ink-900 font-mono">
                {completedSubunitsCount} / {totalSubunitsCount} chương
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-ink-500 font-medium">Tỷ lệ bao phủ</div>
              <div className="text-lg font-bold text-brand-600 font-mono">
                {completionPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full h-2.5 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(2, completionPct)}%` }}
          />
        </div>
      </div>

      {/* 2. Controls: Section Pills & Search Input */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Section Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedSection("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedSection === "ALL"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-card border border-border text-ink-700 hover:bg-muted"
              }`}
            >
              Tất cả các phần (A–F)
            </button>
            {curriculum.map((sec) => (
              <button
                key={sec.code}
                onClick={() => setSelectedSection(sec.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSection === sec.code
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-card border border-border text-ink-700 hover:bg-muted"
                }`}
              >
                Phần {sec.code} ({sec.weight}%)
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="size-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm chương học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Status Filter Sub-bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-ink-500 mr-1 hidden sm:inline">Trạng thái:</span>
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "not_started", label: "Chưa học" },
            { key: "in_progress", label: "Đang học" },
            { key: "completed", label: "Hoàn thành" },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                statusFilter === st.key
                  ? "bg-ink-800 text-white shadow-xs"
                  : "bg-ink-50 hover:bg-ink-100 text-ink-600 border border-ink-200"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Sections & Units Tree */}
      <div className="space-y-6">
        {filteredSections.map((sec) => (
          <div
            key={sec.id}
            className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
          >
            {/* Section Header */}
            <div className="p-4 md:p-5 bg-slate-50/70 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-brand-600 text-white shadow-xs">
                    Phần {sec.code}
                  </span>
                  <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 font-mono">
                    Trọng số đề thi: {sec.weight}%
                  </span>
                </div>
                <h3 className="text-base md:text-lg font-bold text-ink-900 mt-1.5">
                  {sec.title}
                </h3>
              </div>
              <div className="text-xs font-semibold text-ink-600 shrink-0">
                {sec.units.length} Unit · {sec.totalQuestions.toLocaleString()} câu hỏi
              </div>
            </div>

            {/* Units List */}
            <div className="divide-y divide-border">
              {sec.units.map((unit) => {
                const isExpanded = Boolean(expandedUnits[unit.id]);
                const unitCompleted = unit.subunits.filter(
                  (su) => su.status === "completed" || su.status === "mastered"
                ).length;
                const unitProgressPct =
                  unit.subunits.length > 0
                    ? Math.round((unitCompleted / unit.subunits.length) * 100)
                    : 0;

                return (
                  <div key={unit.id} className="transition-colors">
                    {/* Unit Accordion Bar */}
                    <button
                      type="button"
                      onClick={() => toggleUnit(unit.id)}
                      className="w-full px-4 md:px-5 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1 rounded bg-muted text-ink-700">
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-brand-700 uppercase">
                              {unit.code}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              · {unit.subunits.length} chương · {unit.questionCount.toLocaleString()} câu
                            </span>
                          </div>
                          <div className="text-sm md:text-base font-bold text-ink-900 mt-0.5">
                            {unit.title}
                          </div>
                        </div>
                      </div>

                      {/* Mini Unit Progress */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium text-ink-500 font-mono">
                          {unitCompleted}/{unit.subunits.length}
                        </span>
                        <div className="w-20 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-600 rounded-full"
                            style={{ width: `${unitProgressPct}%` }}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Subunits Grid / List */}
                    {isExpanded && (
                      <div className="px-4 md:px-6 py-3 bg-muted/15 space-y-2 border-t border-ink-100">
                        {unit.subunits.map((su) => {
                          const isMastered = su.status === "mastered";
                          const isCompleted = su.status === "completed";
                          const isActive = initialActiveNode === su.id;

                          return (
                            <div
                              key={su.id}
                              className={`p-3.5 rounded-xl border bg-card transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                isActive
                                  ? "border-brand-500 shadow-sm ring-1 ring-brand-300"
                                  : "border-border hover:border-brand-200"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Status badge */}
                                <div
                                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                                    isMastered
                                      ? "bg-emerald-50 text-emerald-600"
                                      : isCompleted
                                      ? "bg-blue-50 text-blue-600"
                                      : "bg-ink-100 text-ink-500"
                                  }`}
                                >
                                  {isMastered ? (
                                    <Award className="size-4" />
                                  ) : isCompleted ? (
                                    <CheckCircle2 className="size-4" />
                                  ) : (
                                    <BookOpen className="size-4" />
                                  )}
                                </div>

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.2 rounded font-mono">
                                      {su.code}
                                    </span>
                                    {isMastered || isCompleted ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Hoàn thành
                                      </span>
                                    ) : su.status === "in_progress" || su.attemptsCount > 0 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Đang học
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                        Chưa học
                                      </span>
                                    )}
                                    <span className="text-xs text-ink-500 font-semibold">
                                      {su.questionCount} câu hỏi
                                    </span>
                                    {/* Stars */}
                                    <div className="flex text-amber-500 text-xs">
                                      {[1, 2, 3].map((star) => (
                                        <span
                                          key={star}
                                          className={
                                            star <= su.stars
                                              ? "opacity-100"
                                              : "opacity-25"
                                          }
                                        >
                                          ★
                                        </span>
                                      ))}
                                    </div>
                                    {su.accuracyPct > 0 && (
                                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                        {su.accuracyPct}% đúng
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-sm font-bold text-ink-900 mt-1">
                                    {su.title}
                                  </h4>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs text-ink-700 cursor-pointer"
                                  onClick={() =>
                                    handleOpenSubunitModal(su, unit, sec)
                                  }
                                >
                                  Chi tiết
                                </Button>

                                <Button
                                  asChild
                                  size="sm"
                                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold gap-1.5 cursor-pointer"
                                >
                                  <Link
                                    href={`/luyen-tap?subunit=${su.id}&mode=practice`}
                                  >
                                    <span>Luyện tập</span>
                                    <Play className="size-3 fill-white" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Subunit Detail Dialog */}
      <SubunitDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subunit={selectedSubunit}
      />
    </div>
  );
}
