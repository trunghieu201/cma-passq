"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

export interface UserStatsPayload {
  totalAnswered: number;
  totalCorrect: number;
  streakDays: number;
  dailyGoalCount: number;
  lastActiveDate?: Date | string | null;
}

export interface UserSessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  targetExamDate?: Date | string | null;
  stats?: UserStatsPayload | null;
}

export interface LayoutContextType {
  user: UserSessionPayload | null;
  dueCount: number;
  setDueCount: React.Dispatch<React.SetStateAction<number>>;
  refreshDueCount: () => Promise<void>;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  selectedCourse: string;
  setSelectedCourse: (courseId: string) => void;
  logout: () => Promise<void>;
}

export const LayoutContext = createContext<LayoutContextType | undefined>(
  undefined
);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}

export interface LayoutProviderProps {
  children: React.ReactNode;
  user: UserSessionPayload | null;
  initialDueCount?: number;
}

export function LayoutProvider({
  children,
  user,
  initialDueCount = 0,
}: LayoutProviderProps) {
  const router = useRouter();
  const [dueCount, setDueCount] = useState<number>(initialDueCount);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("CMA_P2");

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const refreshDueCount = useCallback(async () => {
    try {
      const res = await fetch("/api/user/stats");
      if (res.ok) {
        const json = await res.json();
        if (json?.dailyTodos?.dueFlashcardsCount !== undefined) {
          setDueCount(json.dailyTodos.dueFlashcardsCount);
        }
      }
    } catch (e) {
      // Ignore background refresh failure
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // Proceed to login anyway
    } finally {
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  return (
    <LayoutContext.Provider
      value={{
        user,
        dueCount,
        setDueCount,
        refreshDueCount,
        isMobileOpen,
        setIsMobileOpen,
        toggleMobile,
        selectedCourse,
        setSelectedCourse,
        logout,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}
