"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BookMarked,
  ArrowRight,
  Search,
  Copy,
  Check,
  Calculator,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormulaItem {
  id: string;
  slug: string | null;
  sectionId: string | null;
  titleEn: string;
  titleVi: string;
  latexExpr: string;
  plainExpr: string;
  noteEn: string | null;
  noteVi: string | null;
  isCheatSheet: boolean;
  section?: { code: string; title: string };
  unit?: { unitNumber: number; title: string };
}

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchFormulas = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedSection !== "ALL") params.set("sectionId", selectedSection);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      params.set("limit", "100");

      const res = await fetch(`/api/formulas?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải danh sách công thức.");
      const data = await res.json();
      setFormulas(data.formulas || []);
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSection, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFormulas();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchFormulas]);

  const handleCopy = (formula: FormulaItem) => {
    navigator.clipboard.writeText(`${formula.titleVi}\n${formula.plainExpr}`);
    setCopiedId(formula.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const SECTIONS = [
    { code: "ALL", label: "Tất cả các phần (302)" },
    { code: "A", label: "Phần A: Báo cáo tài chính (20%)" },
    { code: "B", label: "Phần B: Tài chính doanh nghiệp (20%)" },
    { code: "C", label: "Phần C: Phân tích quyết định (25%)" },
    { code: "D", label: "Phần D: Quản trị rủi ro (10%)" },
    { code: "E", label: "Phần E: Quyết định đầu tư (10%)" },
    { code: "F", label: "Phần F: Đạo đức nghề nghiệp (15%)" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <BookMarked className="size-7 text-brand-600" />
            Sổ tay công thức CMA Part 2
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Tổng hợp 302 công thức tính toán tài chính chiến lược, phân tích DuPont, WACC, NPV, IRR chuẩn đề thi IMA.
          </p>
        </div>
        <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-500 text-white">
          <Link href="/dashboard" className="gap-1.5">
            <span>Bảng điều khiển</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="size-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm công thức (ví dụ: DuPont, WACC, NPV, Current Ratio, CAPM, ROE...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Section Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SECTIONS.map((sec) => (
            <button
              key={sec.code}
              onClick={() => setSelectedSection(sec.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSection === sec.code
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-muted/70 text-ink-700 hover:bg-muted"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Formulas Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-ink-100 rounded-xl" />
          ))}
        </div>
      ) : formulas.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border">
          <Calculator className="size-10 text-brand-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-ink-900">Không tìm thấy công thức phù hợp</h3>
          <p className="text-xs text-ink-500 mt-1">
            Hãy thử tìm với từ khóa khác như &quot;WACC&quot;, &quot;ROE&quot;, &quot;NPV&quot;, &quot;Ratio&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formulas.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3 hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.sectionId && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                        Phần {item.sectionId}
                      </span>
                    )}
                    {item.isCheatSheet && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Trọng tâm
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy(item)}
                    title="Sao chép công thức"
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-ink-500 hover:text-ink-900 transition-colors cursor-pointer"
                  >
                    {copiedId === item.id ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-ink-900">{item.titleVi}</h3>
                <p className="text-xs text-ink-500 italic">{item.titleEn}</p>

                {/* Plain Formula Display */}
                <div className="p-3 rounded-lg bg-ink-50 border border-ink-100 font-mono text-xs font-semibold text-brand-900 break-words leading-relaxed">
                  {item.plainExpr}
                </div>

                {/* Usage Notes */}
                {(item.noteVi || item.noteEn) && (
                  <p className="text-xs text-ink-600 leading-relaxed pt-1">
                    💡 {item.noteVi || item.noteEn}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-ink-100 flex items-center justify-between">
                <span className="text-[11px] text-ink-400 font-mono">
                  Mã: {item.id}
                </span>
                <Button asChild variant="ghost" size="xs" className="text-brand-600 gap-1">
                  <Link href={`/luyen-tap?section=${item.sectionId || "A"}`}>
                    <span>Luyện bài tập</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
