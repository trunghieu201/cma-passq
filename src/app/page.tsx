import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HomePageClient } from "./home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  // If user is already authenticated, redirect straight to Dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Otherwise, render full PassQ Portal with 1-click Quick Login
  return <HomePageClient />;
}
