"use client";

import { LoginDrawer } from "@/components/auth/login-drawer";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addAccount = searchParams.get("add_account") === "true";
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Open the drawer after mount
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Allow animation to finish
    setTimeout(() => {
      if (addAccount) {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    }, 300);
  };

  const handleLoginSuccess = () => {
    // The auth context handles the state update
    // We just need to redirect
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LoginDrawer
        isOpen={isOpen}
        onClose={handleClose}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginPageContent />
    </Suspense>
  );
}
