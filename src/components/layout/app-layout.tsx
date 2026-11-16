"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileDrawer } from "./mobile-drawer";
import { LayoutProvider, UserSessionPayload } from "./layout-context";

export interface AppLayoutProps {
  children: React.ReactNode;
  user: UserSessionPayload;
  initialDueCount?: number;
}

export function AppLayout({
  children,
  user,
  initialDueCount = 0,
}: AppLayoutProps) {
  useEffect(() => {
    // PassQ 280-Character Copy Protection Handler
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection) return;
      const text = selection.toString();
      if (text.length > 280) {
        e.preventDefault();
        const truncated = text.slice(0, 280);
        const notice =
          "\n\n[Trích đoạn nội dung PassQ CMA Part 2 - Giới hạn 280 ký tự ghi chú]";
        if (e.clipboardData) {
          e.clipboardData.setData("text/plain", truncated + notice);
        }
      }
    };

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, []);

  return (
    <LayoutProvider user={user} initialDueCount={initialDueCount}>
      <div className="min-h-screen bg-background text-foreground flex antialiased">
        {/* Main Application Area (Rendered first so visible content takes priority in DOM) */}
        <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto animate-in fade-in-50 duration-200">
            {children}
          </main>
          <footer className="py-3 px-4 border-t border-border/40 text-center text-xs text-muted-foreground">
            PassQ CMA Part 2 Architecture Online
          </footer>
        </div>

        {/* Desktop Sidebar (Persistent) */}
        <aside
          data-testid="app-sidebar"
          className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 z-40 border-r border-border bg-card"
        >
          <Sidebar />
        </aside>

        {/* Mobile Slide-Over Drawer */}
        <MobileDrawer />
      </div>
    </LayoutProvider>
  );
}
