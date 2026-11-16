"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  RotateCw,
  FileQuestion,
  GraduationCap,
  BookMarked,
  Bookmark,
  LogOut,
  Smartphone,
} from "lucide-react";
import { PlanPicker } from "./plan-picker";
import { UserLevelBadge } from "./user-level-badge";
import { useLayout } from "./layout-context";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, dueCount, logout } = useLayout();

  const NAV_ITEMS = [
    {
      href: "/dashboard",
      label: "Bảng điều khiển",
      icon: LayoutDashboard,
      testId: "nav-dashboard",
      description: "Việc nên làm hôm nay & số ngày còn lại",
    },
    {
      href: "/lo-trinh",
      label: "Lộ trình",
      icon: Compass,
      testId: "nav-roadmap",
      description: "Lịch học từng tuần theo ngày thi",
    },
    {
      href: "/on-tap",
      label: "Ôn tập hôm nay",
      icon: RotateCw,
      testId: "nav-srs",
      badge: dueCount > 0 ? dueCount : undefined,
      description: "Thẻ & câu hỏi đến hạn ôn tập",
    },
    {
      href: "/luyen-tap",
      label: "Luyện tập",
      icon: FileQuestion,
      testId: "nav-practice",
      description: "Trắc nghiệm theo chương & điểm yếu",
    },
    {
      href: "/thi-thu",
      label: "Thi thử",
      icon: GraduationCap,
      testId: "nav-exam",
      badge: "31 Đề",
      description: "Mô phỏng thi máy Prometric 100 câu",
    },
    {
      href: "/so-tay",
      label: "Sổ tay công thức",
      icon: BookMarked,
      testId: "nav-formulas",
      badge: "302",
      description: "Cheat sheets & công thức tài chính",
    },
    {
      href: "/da-luu",
      label: "Đã lưu",
      icon: Bookmark,
      testId: "nav-bookmarks",
      description: "Nội dung và câu hỏi đã đánh dấu",
    },
  ];

  const handleLinkClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Upper Section: Brand, Course Switcher & Navigation */}
      <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* PassQ Logo */}
        <div className="flex items-center justify-between px-2">
          <Link
            href="/dashboard"
            data-testid="brand-logo"
            className="flex items-center gap-2.5 group"
            onClick={handleLinkClick}
          >
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-ink-900">
                Pass<span className="text-brand-600">Q</span>
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                CMA Exam Prep
              </span>
            </div>
          </Link>
        </div>

        {/* Course Switcher (PlanPicker) */}
        <div className="px-1">
          <PlanPicker />
        </div>

        {/* Primary Navigation Links */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                onClick={handleLinkClick}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-50 text-brand-600 font-semibold shadow-xs"
                    : "text-ink-700 hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-brand-600"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      typeof item.badge === "number"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-muted text-muted-foreground text-[11px]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Area & Session Actions */}
      <div className="p-4 border-t border-border bg-slate-50/50 space-y-3">
        {/* User Card */}
        <div className="p-3 rounded-xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 font-bold text-sm flex items-center justify-center border border-brand-200 shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "HV"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-ink-900 truncate">
                {user?.name || "Học Viên CMA"}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email || "student@passq.test"}
              </span>
            </div>
          </div>

          {/* Level / Rank Badge */}
          <UserLevelBadge totalAnswered={user?.stats?.totalAnswered || 0} />
        </div>

        {/* Device Management & Logout */}
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <Link
            href="/thiet-bi"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            onClick={handleLinkClick}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Thiết bị</span>
          </Link>

          <button
            data-testid="logout-button"
            onClick={logout}
            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}
