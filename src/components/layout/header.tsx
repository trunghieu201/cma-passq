"use client";

import React from "react";
import Link from "next/link";
import { Menu, RotateCw, Flame, User, Smartphone, LogOut } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { useLayout } from "./layout-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { toggleMobile, user, dueCount, logout } = useLayout();
  const streak = user?.stats?.streakDays || 0;

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur px-4 md:px-8 flex items-center justify-between"
    >
      {/* Left Area: Mobile Menu Toggle & Dynamic Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          data-testid="mobile-menu-toggle"
          onClick={toggleMobile}
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* Right Area: Streak, Due Action & User Dropdown */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Streak Counter */}
        <div
          title="Chuỗi ngày học liên tục"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold"
        >
          <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 animate-pulse" />
          <span>{streak} ngày</span>
        </div>

        {/* Due Cards Quick Link */}
        {dueCount > 0 && (
          <Link
            href="/on-tap"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{dueCount} thẻ đến hạn</span>
          </Link>
        )}

        {/* User Menu Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            data-testid="user-menu-dropdown"
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-brand-600/50 transition focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 font-bold text-xs flex items-center justify-center border border-brand-200">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "HV"}
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56 p-1.5" align="end">
            <DropdownMenuLabel className="flex flex-col px-2 py-1.5">
              <span className="font-semibold text-sm text-ink-900 truncate">
                {user?.name || "Học Viên CMA"}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email || "student@passq.test"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Bảng điều khiển</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/thiet-bi"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span>Quản lý thiết bị</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              data-testid="logout-button"
              onClick={logout}
              className="flex items-center gap-2 text-red-600 focus:text-red-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
