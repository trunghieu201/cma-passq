export interface UserRankTier {
  level: number;
  name: string;
  title: string;
  minQuestions: number;
  maxQuestions: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const USER_RANK_TIERS: UserRankTier[] = [
  {
    level: 1,
    name: "Tân binh",
    title: "Rookie",
    minQuestions: 0,
    maxQuestions: 100,
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    badgeBorder: "border-slate-300",
  },
  {
    level: 2,
    name: "Tập sự",
    title: "Apprentice",
    minQuestions: 100,
    maxQuestions: 500,
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200",
  },
  {
    level: 3,
    name: "Chuyên cần",
    title: "Diligent",
    minQuestions: 500,
    maxQuestions: 1500,
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
  },
  {
    level: 4,
    name: "Bứt phá",
    title: "Breakthrough",
    minQuestions: 1500,
    maxQuestions: 3500,
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    badgeBorder: "border-purple-200",
  },
  {
    level: 5,
    name: "Vững vàng",
    title: "Solid",
    minQuestions: 3500,
    maxQuestions: 6000,
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-300",
  },
  {
    level: 6,
    name: "Chuyên gia",
    title: "Expert",
    minQuestions: 6000,
    maxQuestions: 7609,
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    badgeBorder: "border-red-300",
  },
];

export function getUserRank(totalAnswered: number = 0) {
  const safeCount = Math.max(0, totalAnswered);
  const tier =
    USER_RANK_TIERS.find(
      (t) =>
        safeCount >= t.minQuestions &&
        (safeCount < t.maxQuestions || t.level === 6)
    ) || USER_RANK_TIERS[0];

  const range = Math.max(1, tier.maxQuestions - tier.minQuestions);
  const progressInTier = Math.min(
    100,
    Math.max(0, Math.round(((safeCount - tier.minQuestions) / range) * 100))
  );

  return {
    ...tier,
    currentCount: safeCount,
    progressInTier,
    nextTier: tier.level < 6 ? USER_RANK_TIERS[tier.level] : null,
  };
}
