"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionSync } from "@/hooks/use-session-sync";
import { getSuperAdminBrowserClient } from "@/lib/super-admin-supabase";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState, useTransition } from "react";

// ใช้ Supabase client กลางจาก lib/supabase เพื่อเลี่ยง Multiple GoTrueClient
// หมายเหตุ: ตัวแปร supabase ถูก import จาก '@/lib/supabase' แล้วด้านบน

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { clearSession, updateSession } = useSessionSync();
  const didInitRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (didInitRef.current) return;
    didInitRef.current = true;

    router.prefetch("/super-admin-page");

    // หยุดล้าง session อัตโนมัติในหน้า login เพื่อไม่ให้ logout ซ้ำโดยไม่จำเป็น
    console.log("Super Admin Login page loaded - User must login manually");
  }, [clearSession, router]);

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  const fillDefaultCredentials = () => {
    setEmail("gassana2341@gmail.com");
    setPassword("SuperAdmin123!");
    setError(""); // ล้าง error message
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(() => {
      (async () => {
        setLoading(true);
        console.log("🔐 Starting Super Admin login...");
        try {
          const superAdminSupabase = getSuperAdminBrowserClient();
          const { data, error: authError } =
            await superAdminSupabase.auth.signInWithPassword({
              email: email,
              password: password,
            });

          if (authError) {
            console.error("❌ Auth error:", authError.message);
            setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
            return;
          }

          if (!data.user) {
            setError("ไม่พบข้อมูลผู้ใช้");
            return;
          }

          console.log("✅ Authentication successful, checking role...");

          const { data: userProfile, error: profileError } =
            await superAdminSupabase
              .from("users")
              .select("role")
              .eq("id", data.user.id)
              .limit(1)
              .single();

          if (profileError) {
            console.error("❌ Profile error:", profileError.message);
            setError("ไม่สามารถตรวจสอบสิทธิ์ได้");
            await superAdminSupabase.auth.signOut();
            return;
          }

          if (userProfile.role !== "admin") {
            console.error("❌ Insufficient permissions:", userProfile.role);
            setError("คุณไม่มีสิทธิ์เข้าใช้ระบบผู้ดูแล");
            await superAdminSupabase.auth.signOut();
            return;
          }

          console.log("✅ Role verified as admin, redirecting...");
          // ไม่ต้องตั้ง custom cookie แล้ว ปล่อยให้ Supabase auth-helpers จัดการคุกกี้ของมันเอง

          updateSession({
            isAuthenticated: true,
            userRole: "admin",
            timestamp: Date.now(),
          });

          // ใช้ App Router navigation ที่ปลอดภัยกว่า และมี fallback
          try {
            router.replace("/super-admin-page");
            // ถ้า 300ms แล้วยังไม่เปลี่ยนหน้า ให้ fallback เป็น hard navigation
            setTimeout(() => {
              if (
                typeof window !== "undefined" &&
                window.location.pathname !== "/super-admin-page"
              ) {
                window.location.replace("/super-admin-page");
              }
            }, 300);
          } catch (navErr) {
            console.warn(
              "Router navigation failed, falling back to location.replace",
              navErr
            );
            if (typeof window !== "undefined") {
              window.location.replace("/super-admin-page");
            }
          }
        } catch (err) {
          console.error("❌ Login error:", err);
          setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
        } finally {
          setLoading(false);
        }
      })();
    });
  };

  return (
    <div
      className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 lg:p-8"
      suppressHydrationWarning
    >
      <div className="w-full max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Side - Security Hand Phone Image */}
          <div className="relative flex items-center justify-center lg:justify-end order-2 lg:order-1">
            <div className="relative w-80 h-80 lg:w-96 lg:h-96 flex items-center justify-center">
              {/* Main security hand phone illustration */}
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src="/Rectangle 20.png"
                  alt="Hand holding phone with security features - lock icon and password protection"
                  width={400}
                  height={400}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 order-1 lg:order-2">
            {/* Header */}
            <div className="text-center lg:text-left mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                ล็อกอิน เข้าสู่ระบบ
              </h1>
              <p className="text-gray-600 text-lg">
                ยินดีต้อนรับ! กรุณาเข้าสู่ระบบ
              </p>
            </div>

            {/* Login Form */}
            <Card className="shadow-none border-0 bg-transparent">
              <CardContent className="p-8">
                {error && (
                  <Alert className="border-red-200 bg-red-50 mb-6">
                    <AlertDescription className="text-red-800">
                      {error}
                      {error.includes("รหัสผ่านไม่ถูกต้อง") && (
                        <div className="mt-2 text-sm">
                          💡 <strong>หมายเหตุ:</strong> ใช้รหัสผ่าน
                          &quot;SuperAdmin123!&quot; (ไม่ใช่ admin123)
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <form
                  onSubmit={handleLogin}
                  className="space-y-6"
                  suppressHydrationWarning
                >
                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      อีเมล
                    </Label>
                    <div className="relative">
                      <Input
                        id="superadmin-login-email"
                        type="email"
                        placeholder="Example@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-12 px-4 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-gray-900 placeholder:text-gray-400 bg-white"
                        required
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700"
                    >
                      รหัสผ่าน
                    </Label>
                    <div className="relative">
                      <Input
                        id="superadmin-login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="กรอกรหัสผ่าน"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-12 px-4 pr-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-gray-900 placeholder:text-gray-400 bg-white"
                        required
                        suppressHydrationWarning
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        suppressHydrationWarning
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={loading || isPending}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition duration-200 ease-in-out text-base"
                    suppressHydrationWarning
                  >
                    {loading || isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>ยืนยัน</span>
                      </div>
                    ) : (
                      "ยืนยัน"
                    )}
                  </Button>
                </form>

                {/* Default Admin Credentials */}
                <div
                  className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  onClick={fillDefaultCredentials}
                >
                  <p className="text-sm text-blue-800 mb-2">
                    ข้อมูลล็อกอิน Super Admin:
                    <span className="text-blue-600 font-medium">
                      {" "}
                      (คลิกเพื่อใส่อัตโนมัติ)
                    </span>
                  </p>
                  <div className="text-xs text-blue-600 space-y-1">
                    <p>
                      <strong>Email:</strong> gassana2341@gmail.com
                    </p>
                    <p>
                      <strong>Password:</strong> SuperAdmin123!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
