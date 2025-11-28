"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Bell, ChevronDown, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ComingSoonPage() {
  const router = useRouter();
  const { isLoggedIn, userRole, baseRole, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Background with Topbar - Same as homepage */}
      <div className="relative w-full">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-background.jpg"
            alt="Bangkok skyline"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-teal-900/60"></div>
        </div>

        {/* Top Navigation - Same as homepage */}
        <div className="relative z-10 shadow-md border-b border-white/20">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-white font-bold text-lg">
                TEEDIN EASY
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-white hover:text-blue-200 text-sm"
                  suppressHydrationWarning={true}
                >
                  {t("buy")}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-white hover:text-blue-200 text-sm"
                  suppressHydrationWarning={true}
                >
                  {t("rent")}
                </button>
                <Link
                  href="/coming-soon"
                  className="text-white hover:text-blue-200 text-sm"
                >
                  {t("real_estate")}
                </Link>
                <Link
                  href="/coming-soon"
                  className="text-white hover:text-blue-200 text-sm"
                >
                  {t("new_real_estate")}
                </Link>
                <Link
                  href="/coming-soon"
                  className="text-white hover:text-blue-200 text-sm"
                >
                  {t("new_projects")}
                </Link>
              </nav>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {isLoggedIn && (
                <button
                  type="button"
                  aria-label="Notifications"
                  className="text-white"
                >
                  <Bell size={20} />
                </button>
              )}
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Language selector"
                      className="flex items-center text-white bg-transparent border border-white/30 rounded-md px-3 py-1 focus:outline-none focus:ring-0"
                      suppressHydrationWarning
                    >
                      <span className="mr-1">
                        {language === "th"
                          ? t("language_th")
                          : t("language_en")}
                      </span>
                      <ChevronDown size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setLanguage("th")}
                      className={
                        language === "th"
                          ? "bg-blue-600 text-white font-bold"
                          : ""
                      }
                    >
                      {t("language_th")} - TH
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setLanguage("en")}
                      className={
                        language === "en"
                          ? "bg-blue-600 text-white font-bold"
                          : ""
                      }
                    >
                      {t("language_en")} - EN
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {isLoggedIn ? (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                  onClick={() => router.push("/dashboard")}
                  suppressHydrationWarning
                >
                  <User size={18} />
                  {t("profile")}
                </Button>
              ) : (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  onClick={() => router.push("/auth/login")}
                  suppressHydrationWarning
                >
                  {t("login")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content - GitHub style with "กำลังพัฒนา" */}
      <main className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 bg-white">
        <div className="text-center max-w-md w-full">
          <div className="mb-8">
            <h1 className="text-8xl font-bold text-gray-300 mb-2">404</h1>
            <p className="text-gray-600 text-lg md:text-xl font-medium mb-4">
              {language === "th"
                ? "หน้านี้ยังอยู่ในขั้นตอนการพัฒนา"
                : "This page is still under development"}
            </p>
          </div>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
              {language === "th" ? "กลับหน้าหลัก" : "Back to Home"}
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
