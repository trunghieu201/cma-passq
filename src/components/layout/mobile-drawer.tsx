"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { useLayout } from "./layout-context";
import { X } from "lucide-react";

export function MobileDrawer() {
  const { isMobileOpen, setIsMobileOpen } = useLayout();

  if (!isMobileOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Drawer Panel */}
      <div className="relative flex flex-col w-72 max-w-[80vw] bg-card border-r border-border shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted z-20 cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        <Sidebar onNavigate={() => setIsMobileOpen(false)} />
      </div>
    </div>
  );
}
