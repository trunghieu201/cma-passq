import React from "react";

export function DashboardHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-ink-900 tracking-tight">
          Bảng điều khiển
        </h1>
        <p className="text-sm text-ink-600 mt-0.5">
          Việc nên làm hôm nay và số ngày còn lại tới kỳ thi. Mỗi lần vào học, bắt đầu từ đây.
        </p>
      </div>
      <div className="self-start sm:self-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
          CMA Part 2 · Chiến lược & Quản trị tài chính
        </span>
      </div>
    </div>
  );
}
