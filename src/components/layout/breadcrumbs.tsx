"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Bảng điều khiển",
  "lo-trinh": "Lộ trình học",
  "doi-ngay-thi": "Đổi ngày thi",
  "cap-nhat": "Cập nhật lộ trình",
  "on-tap": "Ôn tập hôm nay",
  "luyen-tap": "Luyện tập",
  "thi-thu": "Thi thử Prometric",
  "so-tay": "Sổ tay công thức",
  "da-luu": "Nội dung đã lưu",
  "thiet-bi": "Quản lý thiết bị",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">PassQ</span>
      </Link>

      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = ROUTE_LABELS[segment] || decodeURIComponent(segment);

        return (
          <React.Fragment key={href}>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-ink-900 truncate max-w-[150px] sm:max-w-none">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors truncate"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
