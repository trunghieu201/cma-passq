"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const MAX_COPY_CHARS = 280;
export const COPY_NOTICE_MESSAGE =
  "Chỉ sao chép được đoạn ngắn (tối đa 280 ký tự) để ghi chú";

export interface CopyProtectionOptions {
  maxChars?: number;
  noticeMessage?: string;
  onExceeded?: (selectedLength: number) => void;
}

/**
 * Hook to enforce copy protection within an element or globally
 */
export function useCopyProtection(options: CopyProtectionOptions = {}) {
  const {
    maxChars = MAX_COPY_CHARS,
    noticeMessage = COPY_NOTICE_MESSAGE,
    onExceeded,
  } = options;

  const [notice, setNotice] = useState<string | null>(null);

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      const selection = window.getSelection();
      const text = selection ? selection.toString() : "";

      if (text.length > maxChars) {
        e.preventDefault();
        const truncated = text.slice(0, maxChars);
        const noticeSuffix = "\n\n[Trích đoạn PassQ CMA Part 2 - Giới hạn 280 ký tự ghi chú]";
        if (e.clipboardData) {
          e.clipboardData.setData("text/plain", truncated + noticeSuffix);
        }
        setNotice(noticeMessage);
        if (onExceeded) {
          onExceeded(text.length);
        }
      }
    },
    [maxChars, noticeMessage, onExceeded]
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  return { handleCopy, notice, clearNotice: () => setNotice(null) };
}

interface CopyProtectedContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  maxChars?: number;
  noticeMessage?: string;
}

export function CopyProtectedContainer({
  children,
  className,
  maxChars = MAX_COPY_CHARS,
  noticeMessage = COPY_NOTICE_MESSAGE,
  ...props
}: CopyProtectedContainerProps) {
  const [showToast, setShowToast] = useState(false);

  const onCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const text = selection ? selection.toString() : "";

    if (text.length > maxChars) {
      e.preventDefault();
      const truncated = text.slice(0, maxChars);
      const noticeSuffix = "\n\n[Trích đoạn PassQ CMA Part 2 - Giới hạn 280 ký tự ghi chú]";
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", truncated + noticeSuffix);
      }
      setShowToast(true);
    }
  };

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 3500);
    return () => clearTimeout(timer);
  }, [showToast]);

  return (
    <div
      onCopy={onCopy}
      className={cn("relative", className)}
      data-testid="copy-protected-container"
      {...props}
    >
      {children}
      {showToast && (
        <div
          role="status"
          data-testid="copy-protection-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-medium text-brand-700 shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-brand-600" />
          <span>{noticeMessage}</span>
        </div>
      )}
    </div>
  );
}
