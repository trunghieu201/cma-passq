"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { Compass, Calendar, Sliders, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoadmapTree } from "@/components/roadmap/roadmap-tree";

export default function RoadmapPage() {
  return (
    <div className="space-y-6">
      {/* Page Title & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <Compass className="size-7 text-brand-600" />
            Lộ trình học CMA Part 2
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Lịch học từng tuần được cá nhân hóa theo ngày thi của bạn. 6 phần kiến thức chuẩn IMA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/lo-trinh/doi-ngay-thi" className="gap-1.5">
              <Calendar className="size-4" />
              <span>Đổi ngày thi</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/lo-trinh/cap-nhat" className="gap-1.5">
              <Sliders className="size-4" />
              <span>Cập nhật kế hoạch</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-500 text-white">
            <Link href="/dashboard" className="gap-1.5">
              <span>Bảng điều khiển</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Roadmap Curriculum Tree */}
      <Suspense fallback={<div className="h-64 bg-ink-100 rounded-xl animate-pulse" />}>
        <RoadmapTree />
      </Suspense>
    </div>
  );
}
