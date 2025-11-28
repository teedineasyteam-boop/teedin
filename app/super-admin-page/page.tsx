"use client";

import { DashboardStats } from "@/components/super-admin/dashboard-stats";
import SuperAdminNotifications from "@/components/super-admin/notifications";
import PropertiesManagementTable from "@/components/super-admin/properties-management-table";
import { PropertiesTable } from "@/components/super-admin/properties-table";
import { PropertiesTrendChart } from "@/components/super-admin/properties-trend-chart";
import PropertyListingsModal from "@/components/super-admin/property-listings-modal";
import SuperAdminSettings from "@/components/super-admin/settings";
import { SuperAdminSidebar } from "@/components/super-admin/sidebar";
import { SuperAdminTopBar } from "@/components/super-admin/topbar";
import {
  default as AgentsManagementTable,
  default as SuperAdminUsers,
} from "@/components/super-admin/users-management";
import { Button } from "@/components/ui/button";
import { useSessionSync } from "@/hooks/use-session-sync";
import { getSuperAdminBrowserClient } from "@/lib/super-admin-supabase";
import { LogOut } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";

// 🔐 Import Smart Adaptive Security System
import { SessionWarning, useSuperAdminSession } from "./security";

// Dynamic import for PendingPropertiesPage
const PendingPropertiesPage = dynamic(
  () => import("./pending-properties/page"),
  { ssr: false }
);

// ใช้ Supabase client ที่สร้างไว้สำหรับ client components

// สร้าง wrapper สำหรับ icons เพื่อป้องกัน hydration mismatch
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <span suppressHydrationWarning>{children}</span>
);

interface Property {
  id: string;
  title: string;
  price: number;
  status: string;
  created_at: string;
  users?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

// Wrapper component สำหรับใช้ useSearchParams ภายใน Suspense
function SuperAdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearSession } = useSessionSync();

  // 🔐 Initialize Smart Adaptive Security System
  const {
    timeRemaining,
    isWarningShown,
    currentRiskLevel,
    logout: securityLogout,
    extendSession,
    trackActivity,
  } = useSuperAdminSession();

  // อ่าน activeTab จาก URL query parameter
  const tabFromUrl = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [propertiesViewPeriod, setPropertiesViewPeriod] = useState("recent");
  const [propertiesData, setPropertiesData] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesLastUpdate, setPropertiesLastUpdate] = useState<Date | null>(
    null
  );
  const [propertiesPage, setPropertiesPage] = useState(1);
  const [propertiesTotalPages, setPropertiesTotalPages] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // หน้านี้จะไม่ถูกเข้าถึงโดยตรง เพราะ middleware จะ redirect ไป login ก่อน
  // แต่เก็บ code นี้ไว้เผื่อมีการเข้าถึงผ่านทางอื่น
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const superAdminSupabase = getSuperAdminBrowserClient();
        // ตรวจสอบ session จาก Supabase
        const {
          data: { session },
          error,
        } = await superAdminSupabase.auth.getSession();

        if (error || !session) {
          router.replace("/super-admin-login");
          return;
        }

        // ตรวจสอบ role ของผู้ใช้
        const { data: userProfile, error: profileError } =
          await superAdminSupabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (profileError || userProfile.role !== "admin") {
          await superAdminSupabase.auth.signOut();
          router.replace("/super-admin-login");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        router.replace("/super-admin-login");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthentication();
  }, [router]);

  // Fix hydration - รอให้ client mount เสร็จก่อน
  useEffect(() => {
    setIsClient(true);
    setPropertiesLastUpdate(new Date());
  }, []);

  // Fetch pending properties count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch(
          "/api/admin/properties/pending?page=1&limit=1",
          {
            credentials: "include", // ส่ง cookies ไปกับ request
          }
        );
        if (response.ok) {
          const data = await response.json();
          setPendingCount(data.total || 0);
        }
      } catch (error) {}
    };
    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // CSS for custom animations
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes swing {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(15deg); }
        75% { transform: rotate(-15deg); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.5); }
        50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.6); }
      }
      .bell-swing:hover {
        animation: swing 0.6s ease-in-out;
      }
      .notification-glow {
        animation: glow 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    fetchPropertiesData();
  }, [propertiesPage]);

  useEffect(() => {
    // reset to first page when period changes
    setPropertiesPage(1);
    fetchPropertiesData(1);
  }, [propertiesViewPeriod]);

  const fetchPropertiesData = async (pageOverride?: number) => {
    try {
      // 🔐 Track properties data viewing
      trackActivity("VIEW_PROPERTIES_DATA");

      setPropertiesLoading(true);
      // ใช้ API ที่รองรับ pagination
      const pageParam = pageOverride ?? propertiesPage;
      const response = await fetch(
        `/api/admin/properties?page=${pageParam}&limit=20&status=all`
      );
      if (response.ok) {
        const data = await response.json();
        setPropertiesData(data.properties || []);
        setPropertiesTotalPages(data.totalPages || 1);
        if (isClient) {
          setPropertiesLastUpdate(new Date());
        }
      } else {
        // fallback: แสดงข้อมูลว่าง ไม่ใช้ mock data
        setPropertiesData([]);
        setPropertiesTotalPages(1);
        if (isClient) {
          setPropertiesLastUpdate(new Date());
        }
      }
    } catch (error) {
      setPropertiesData([]);
      setPropertiesTotalPages(1);
      if (isClient) {
        setPropertiesLastUpdate(new Date());
      }
    } finally {
      setPropertiesLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const superAdminSupabase = getSuperAdminBrowserClient();
      // 🔐 Use Security System logout (handles JWT and all security cleanup)
      securityLogout();

      // ล้าง session sync ก่อน - จะแจ้งไปยังแท็บอื่นๆ ทันที
      clearSession();

      // Clear stored data
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      localStorage.removeItem("admin");
      localStorage.removeItem("adminToken");
      sessionStorage.clear();

      // Clear cookies
      document.cookie.split(";").forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Sign out from Supabase
      try {
        await superAdminSupabase.auth.signOut();
      } catch (_error) {}

      // Call logout API
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
      } catch (_error) {
        // Logout API call failed, but continuing with client-side logout
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.replace("/super-admin-login");
    } catch (error) {
      window.location.replace("/super-admin-login");
    }
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  // Sync activeTab กับ URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "dashboard";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const handleSidebarItemClick = (itemId: string) => {
    if (itemId === "logout") {
      // 🔐 Track logout attempt as HIGH risk activity
      trackActivity("LOGOUT_REQUEST");
      confirmLogout();
    } else {
      // 🔐 Track navigation activity
      trackActivity(`NAVIGATE_TO_${itemId.toUpperCase()}`);
      // อัพเดท URL query parameter แทนการ set state โดยตรง
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", itemId);
      router.push(`/super-admin-page?${params.toString()}`, { scroll: false });
    }
  };

  const handlePropertiesViewChange = (period: string) => {
    setPropertiesViewPeriod(period);
    // Reset to first page when changing view period
  };

  const handleExportPropertiesData = () => {
    if (
      !propertiesData ||
      !Array.isArray(propertiesData) ||
      propertiesData.length === 0
    ) {
      alert("ไม่มีข้อมูลให้ส่งออก");
      return;
    }

    const csvHeaders = [
      "ลำดับ",
      "ชื่อโครงการ",
      "ชื่อเอเจนท์",
      "อีเมลเอเจนท์",
      "วันที่ลงประกาศ",
      "ราคา",
      "สถานะ",
    ];
    const csvRows = [
      csvHeaders.join(","),
      ...propertiesData.map((property, index) =>
        [
          index + 1,
          `"${property.title}"`,
          `"${property.users?.first_name || ""} ${
            property.users?.last_name || ""
          }"`,
          `"${property.users?.email || ""}"`,
          `"${property.created_at}"`,
          property.price,
          `"${property.status}"`,
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const fileName = `properties_data_${propertiesViewPeriod}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderDashboard = () => {
    return (
      <div className="space-y-8">
        <DashboardStats />
        <PropertiesTrendChart />
        <PropertiesTable
          properties={propertiesData}
          viewPeriod={propertiesViewPeriod}
          loading={propertiesLoading}
          lastUpdate={propertiesLastUpdate}
          isClient={isClient}
          onViewPeriodChange={handlePropertiesViewChange}
          onRefresh={() => fetchPropertiesData()}
          onExport={handleExportPropertiesData}
          serverPaginated
          currentPage={propertiesPage}
          totalPages={propertiesTotalPages}
          onChangePage={page => setPropertiesPage(page)}
        />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "users":
        return (
          <div className="p-8">
            <SuperAdminUsers />
          </div>
        );
      case "agents":
        return (
          <div className="p-8">
            <AgentsManagementTable />
          </div>
        );
      case "properties":
        return (
          <div className="p-8">
            <PropertiesManagementTable />
          </div>
        );
      case "pending-properties":
        return (
          <div className="p-0">
            <PendingPropertiesPage />
          </div>
        );
      case "notifications":
        return (
          <div className="p-8">
            <SuperAdminNotifications />
          </div>
        );
      case "settings":
        return (
          <div className="p-8">
            <SuperAdminSettings />
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  // แสดง loading หากยังตรวจสอบสิทธิ์ไม่เสร็จ
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // ถ้าไม่ได้รับการยืนยันสิทธิ์ ไม่แสดงอะไรเลย (เพราะจะ redirect ไปหน้า login)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isClient ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <SuperAdminSidebar
            activeTab={activeTab}
            sidebarOpen={sidebarOpen}
            onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
            onItemClick={handleSidebarItemClick}
            pendingCount={pendingCount}
          />
          <div
            className={`transition-all duration-300 ${
              sidebarOpen ? "ml-64" : "ml-16"
            }`}
          >
            <SuperAdminTopBar onLogout={confirmLogout} />
            <main className="p-6">{renderContent()}</main>
          </div>

          {/* Logout Confirmation Modal */}
          {showLogoutModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <IconWrapper>
                      <LogOut className="h-5 w-5 text-red-600" />
                    </IconWrapper>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    ยืนยันการออกจากระบบ
                  </h3>
                </div>
                <p className="text-gray-600 mb-6">
                  คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?
                  คุณจะต้องเข้าสู่ระบบใหม่อีกครั้ง
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowLogoutModal(false)}
                    className="px-4 py-2"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={() => {
                      setShowLogoutModal(false);
                      handleLogout();
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    ออกจากระบบ
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Property Listings Modal */}
          <PropertyListingsModal
            isOpen={showPropertyModal}
            onClose={() => setShowPropertyModal(false)}
            title="ประกาศอสังหาริมทรัพย์ทั้งหมด"
          />

          {/* 🔐 Smart Adaptive Security Warning */}
          <SessionWarning
            isVisible={isWarningShown}
            timeRemaining={timeRemaining}
            riskLevel={currentRiskLevel}
            onExtendSession={extendSession}
            onLogout={handleLogout}
            onDismiss={() => {
              console.log(
                "⏰ User dismissed warning, will show again in 5 minutes"
              );
              // Warning จะแสดงอีกครั้งอัตโนมัติใน 5 นาที
            }}
          />
        </>
      )}
    </div>
  );
}

// Main component ที่ wrap ด้วย Suspense
export default function SuperAdminRealDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <SuperAdminDashboardContent />
    </Suspense>
  );
}
