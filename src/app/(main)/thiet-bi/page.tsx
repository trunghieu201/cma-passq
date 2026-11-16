"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Laptop,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayout } from "@/components/layout/layout-context";

export default function DeviceManagementPage() {
  const { user, logout } = useLayout();
  const [loggedOutOther, setLoggedOutOther] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleLogoutOtherDevices = async () => {
    try {
      setIsRevoking(true);
      await fetch("/api/auth/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke-others" }),
      });
      setLoggedOutOther(true);
      setTimeout(() => setLoggedOutOther(false), 4000);
    } catch (e) {
      // Ignore
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <Smartphone className="size-6 text-brand-600" />
            Quản lý thiết bị đăng nhập
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Chính sách bảo mật PassQ cho phép đăng nhập tối đa 2 thiết bị cùng lúc.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard" className="gap-1.5">
            <span>Bảng điều khiển</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-sm font-bold text-ink-900 mb-3">
            Thiết bị đang hoạt động ({user?.name || "Tài khoản học viên"})
          </h3>

          <div className="space-y-3">
            {/* Primary active session */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                  <Laptop className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                    <span>Trình duyệt hiện tại (Web App)</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                      Thiết bị này
                    </span>
                  </div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    Phiên làm việc bảo mật JWT · Hết hạn sau 7 ngày
                  </div>
                </div>
              </div>
              <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
            </div>
          </div>
        </div>

        {loggedOutOther && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>Đã thu hồi tất cả các phiên đăng nhập khác ngoại trừ thiết bị này.</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRevoking}
            onClick={handleLogoutOtherDevices}
            className="w-full sm:w-auto text-xs text-ink-700 cursor-pointer"
          >
            {isRevoking ? "Đang thu hồi..." : "Đăng xuất khỏi thiết bị khác"}
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={logout}
            className="w-full sm:w-auto text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Đăng xuất thiết bị này</span>
          </Button>
        </div>

        <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-brand-600" />
            Quy định bảo vệ bản quyền tài liệu CMA Part 2:
          </div>
          <div className="leading-relaxed">
            Hệ thống áp dụng công nghệ chống sao chép nội dung câu hỏi và phân tích bẫy độc quyền. Mỗi tài khoản chỉ được sử dụng cho một học viên theo đúng điều khoản PassQ.
          </div>
        </div>
      </div>
    </div>
  );
}
