"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { SUPER_ADMIN_COOKIE_NAME } from "@/lib/super-admin-supabase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  computeInitials,
  deriveAvatarTheme,
  pickDeterministicColor,
} from "@/utils/avatar-colors";

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutConfirmationModal({
  isOpen,
  onClose,
}: LogoutConfirmationModalProps) {
  const router = useRouter();

  const { logout: authLogout, user } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("");
  const [avatarColor, setAvatarColor] = useState<string>("#60a5fa"); // default blue-400
  const [isLoading, setIsLoading] = useState(false);

  // Derived colors (memoized to avoid recalculation each render)
  const derived = useMemo(() => deriveAvatarTheme(avatarColor), [avatarColor]);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.id) return;
      let url: string | null =
        (user.user_metadata?.avatar_url as string | null) ||
        (user.user_metadata?.picture as string | null) ||
        null;
      let fullName: string | undefined =
        user.user_metadata?.full_name ||
        `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim();

      try {
        const { data: customer } = await supabase
          .from("customers")
          .select("profile_picture, full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (customer) {
          if (!url && customer.profile_picture) url = customer.profile_picture;
          if (!fullName && customer.full_name) fullName = customer.full_name;
        }
      } catch (e) {
        // ignore
      }

      try {
        const { data: agent } = await supabase
          .from("agens")
          .select("profile_picture")
          .eq("user_id", user.id)
          .maybeSingle();
        if (agent && !url && agent.profile_picture) url = agent.profile_picture;
      } catch (e) {
        // ignore
      }

      setAvatarUrl(url);
      setInitials(
        computeInitials(
          fullName,
          user.user_metadata?.first_name,
          user.user_metadata?.last_name,
          user.email || undefined
        )
      );

      // Pick avatar color - user can specify in metadata, else per-user deterministic
      const customColor =
        (user.user_metadata?.avatar_color as string) ||
        (user.user_metadata?.color as string);
      if (customColor && /^#?[0-9a-fA-F]{6}$/.test(customColor)) {
        setAvatarColor(
          customColor.startsWith("#") ? customColor : `#${customColor}`
        );
      } else if (user.id) {
        setAvatarColor(pickDeterministicColor(user.id));
      }
    };

    if (isOpen) {
      loadAvatar();
    }
  }, [isOpen, user?.id]);

  const handleLogout = async () => {
    if (isLoading) return; // Prevent multiple clicks

    setIsLoading(true);
    try {
      // ออกจากระบบผ่าน AuthContext ที่เชื่อมต่อกับ Supabase (public client เท่านั้น)
      await authLogout();

      // ลบเฉพาะ public session items จาก localStorage (ไม่ลบ super admin)
      const publicKeys = [
        "isLoggedIn",
        "userRole",
        "userData",
        "rememberMe",
        "property-data-cache",
        "property-data-cache-expiry",
        "tedin_session_state", // session sync
      ];
      publicKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // ลบ Supabase auth tokens จาก public client (ไม่ลบ super admin)
      // Supabase default client ใช้ keys ในรูปแบบ sb-<project-ref>-auth-token
      // แต่เนื่องจากเราใช้ localStorage/sessionStorage เป็นหลัก เราต้องลบ keys เหล่านี้
      const supabaseKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase.auth"))) {
          // ข้าม super admin keys
          if (!key.includes("super-admin") && !key.includes("sb-super-admin")) {
            supabaseKeys.push(key);
          }
        }
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase.auth"))) {
          // ข้าม super admin keys
          if (!key.includes("super-admin") && !key.includes("sb-super-admin")) {
            supabaseKeys.push(key);
          }
        }
      }
      supabaseKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // ลบเฉพาะ public cookies (ไม่ลบ super admin cookies)
      // Supabase default client ใช้ localStorage/sessionStorage เป็นหลัก
      // แต่ถ้ามี cookies ที่เกี่ยวข้องกับ public auth ก็ต้องลบ
      const cookiesToDelete: string[] = [];
      document.cookie.split(";").forEach(function (c) {
        const cookieName = c.split("=")[0].trim();
        // ข้าม super admin cookies
        if (cookieName.startsWith(SUPER_ADMIN_COOKIE_NAME)) {
          return;
        }
        // ข้าม cookies อื่นๆ ที่ไม่ใช่ public auth (เช่น language, sidebar state)
        if (
          cookieName === "lang" ||
          cookieName.startsWith("sidebar-") ||
          cookieName.startsWith("tedin-")
        ) {
          return;
        }
        // ลบเฉพาะ cookies ที่เกี่ยวข้องกับ Supabase public auth
        // Supabase อาจจะสร้าง cookies ในรูปแบบ sb-<project-ref>-auth-token
        // แต่เนื่องจากเราใช้ localStorage/sessionStorage เป็นหลัก cookies เหล่านี้อาจจะไม่มี
        // แต่ถ้ามีก็ต้องลบ (ยกเว้น super admin)
        cookiesToDelete.push(cookieName);
      });

      // ลบ cookies ที่เก็บไว้
      cookiesToDelete.forEach(cookieName => {
        // ลบ cookie ทุก path และ domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
      });

      // Redirect to home page โดยใช้ replace เพื่อป้องกัน back button
      window.location.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoading(false); // Reset loading state on error
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center shadow-xl">
          {/* User avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="โปรไฟล์"
              className="w-24 h-24 rounded-full object-cover mb-6 border-4 border-white shadow-md"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full mb-6 flex items-center justify-center text-white text-2xl font-semibold ring-2 ring-offset-2 ring-offset-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${derived.bgStart}, ${derived.bgEnd})`,
                boxShadow: `0 2px 8px ${derived.shadow}`,
                outline: `2px solid ${derived.outline}`,
              }}
            >
              {initials}
            </div>
          )}

          {/* Confirmation text */}
          <h2 className="text-2xl font-bold mb-8 text-center text-slate-800">
            ต้องการออกจากระบบ?
          </h2>

          {/* Buttons */}
          <div className="w-full space-y-3">
            <Button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  กำลังออกจากระบบ...
                </div>
              ) : (
                "ยืนยัน"
              )}
            </Button>

            <Button
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
              className="w-full border-gray-300 text-gray-800 font-bold py-3 rounded-md bg-white hover:bg-gray-200 disabled:text-gray-400 disabled:bg-gray-100"
            >
              ย้อนกลับ
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
