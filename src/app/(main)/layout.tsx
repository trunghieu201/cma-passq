import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppLayout } from "@/components/layout/app-layout";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Authenticate user session server-side
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch live study stats and due cards count server-side
  let stats: any = null;
  let dueCount = 0;
  try {
    const [fetchedStats, fetchedDueCount] = await Promise.all([
      prisma.userStudyStats.findUnique({
        where: { userId: user.id },
        select: {
          totalAnswered: true,
          totalCorrect: true,
          streakDays: true,
          dailyGoalCount: true,
          lastActiveDate: true,
        },
      }).catch(() => null),
      prisma.userQuestionReview.count({
        where: {
          userId: user.id,
          dueDate: { lte: new Date() },
        },
      }).catch(() => 0),
    ]);
    stats = fetchedStats;
    dueCount = fetchedDueCount || 0;
  } catch (err) {
    console.error('[Layout] Error fetching user stats/reviews:', err);
  }

  const sanitizedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    targetExamDate: user.targetExamDate,
    stats: stats || {
      totalAnswered: 0,
      totalCorrect: 0,
      streakDays: 0,
      dailyGoalCount: 20,
      lastActiveDate: null,
    },
  };

  return (
    <AppLayout user={sanitizedUser} initialDueCount={dueCount}>
      {children}
    </AppLayout>
  );
}
