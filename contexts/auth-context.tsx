"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import {
  getSuperAdminBrowserClient,
  SUPER_ADMIN_COOKIE_NAME,
} from "@/lib/super-admin-supabase";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { AlertCircle } from "lucide-react";
import React, { createContext, useContext, useEffect, useState } from "react";

// User types
export type UserRole =
  | "customer"
  | "agent"
  | "admin"
  | "superAdmin"
  | "super_admin";

export interface StoredAccount {
  user: User;
  session: Session;
  role: UserRole;
  baseRole: UserRole;
  lastActive: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  userRole: UserRole | null;
  baseRole: UserRole | null; // Added baseRole
  // Helper properties
  isAdmin: boolean;
  isSuperAdmin: boolean;
  setIsLoggedIn: (value: boolean) => void;
  setUserRole: (role: UserRole | null) => void;

  // Multi-account support
  accounts: StoredAccount[];
  switchAccount: (userId: string) => Promise<void>;
  addAccount: () => void; // Redirects to login to add account
  removeAccount: (userId: string) => Promise<void>;
  reActivateCurrentSession: (userId: string) => Promise<void>;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  login: (
    emailOrPhone: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{
    error: any | null;
    requiresOtp?: boolean;
    phone?: string;
    email?: string;
  }>;
  loginAfterOtpVerification: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ error: any | null }>;
  loginWithGoogle: () => Promise<{ error: any | null }>;
  loginWithLine: () => Promise<{ error: any | null }>;
  loginWithOtp: (phone: string) => Promise<{ error: any | null }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ error: any | null }>;
  finalizeRegistration: (args: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
  }) => Promise<{ error: any | null }>;
  sendPasswordResetOtp: (email: string) => Promise<{ error: any | null }>;
  verifyPasswordResetOtp: (
    email: string,
    otp: string
  ) => Promise<{ error: any | null; resetToken?: string }>;
  resetPassword: (
    email: string,
    resetToken: string,
    newPassword: string
  ) => Promise<{ error: any | null }>;
  logout: () => Promise<void>;
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  userRole: null,
  baseRole: null, // Added baseRole
  isAdmin: false,
  isSuperAdmin: false,
  setIsLoggedIn: () => { },
  setUserRole: () => { },

  accounts: [],
  switchAccount: async () => { },
  addAccount: () => { },
  removeAccount: async () => { },
  reActivateCurrentSession: async () => { },

  setUser: () => { },
  setSession: () => { },
  login: async (
    emailOrPhone: string,
    password: string,
    rememberMe?: boolean
  ) => ({ error: null }),
  loginAfterOtpVerification: async (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => ({ error: null }),
  loginWithGoogle: async () => ({ error: null }),
  loginWithLine: async () => ({ error: null }),
  loginWithOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  finalizeRegistration: async () => ({ error: null }),
  sendPasswordResetOtp: async () => ({ error: null }),
  verifyPasswordResetOtp: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  logout: async () => { },
  user: null,
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [baseRole, setBaseRole] = useState<UserRole | null>(null); // Added baseRole
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [sessionExpiredModalOpen, setSessionExpiredModalOpen] = useState(false);
  const [expiredAccountEmail, setExpiredAccountEmail] = useState("");

  // Load accounts from storage on mount
  useEffect(() => {
    const storedAccounts = localStorage.getItem("tedin_accounts");
    if (storedAccounts) {
      try {
        setAccounts(JSON.parse(storedAccounts));
      } catch (e) {
        console.error("Failed to parse stored accounts", e);
      }
    }
  }, []);

  // Helper to manage session pool and groups
  const updateSessionPoolAndGroups = (currentAccounts: StoredAccount[]) => {
    try {
      // 1. Update Session Pool (Save everyone's latest state)
      const poolStr = localStorage.getItem("tedin_session_pool");
      let pool: Record<string, StoredAccount> = {};
      try {
        pool = poolStr ? JSON.parse(poolStr) : {};
      } catch (e) {
        console.error("Error parsing session pool", e);
        pool = {};
      }

      currentAccounts.forEach(acc => {
        pool[acc.user.id] = acc;
      });

      // Optional: Clean up very old sessions (e.g. > 30 days) to save space
      const now = new Date().getTime();
      Object.keys(pool).forEach(key => {
        const acc = pool[key];
        if (acc.lastActive) {
          const lastActive = new Date(acc.lastActive).getTime();
          if (now - lastActive > 30 * 24 * 60 * 60 * 1000) {
            delete pool[key];
          }
        }
      });

      localStorage.setItem("tedin_session_pool", JSON.stringify(pool));

      // 2. Update Groups (Tell everyone in this list that they are related)
      const groupsStr = localStorage.getItem("tedin_account_groups");
      let groups: Record<string, string[]> = {};
      try {
        groups = groupsStr ? JSON.parse(groupsStr) : {};
      } catch (e) {
        console.error("Error parsing groups", e);
        groups = {};
      }

      const allIds = currentAccounts.map(a => a.user.id);

      // Update the group for EACH user in the current list
      currentAccounts.forEach(acc => {
        groups[acc.user.id] = allIds;
      });

      localStorage.setItem("tedin_account_groups", JSON.stringify(groups));
    } catch (e) {
      console.error("Error updating session pool/groups:", e);
    }
  };

  // Helper to recover a group for a specific user
  const recoverGroupForUser = (userId: string): StoredAccount[] | null => {
    try {
      const groupsStr = localStorage.getItem("tedin_account_groups");
      const poolStr = localStorage.getItem("tedin_session_pool");

      if (!groupsStr || !poolStr) return null;

      let groups: Record<string, string[]> = {};
      let pool: Record<string, StoredAccount> = {};

      try {
        groups = JSON.parse(groupsStr);
        pool = JSON.parse(poolStr);
      } catch (e) {
        console.error("Error parsing storage for recovery", e);
        return null;
      }

      // Strategy: Only use the group explicitly defined for this user.
      // We avoid "Reverse Lookup" (scanning other groups) to prevent accidental merging
      // with stale groups or unrelated accounts (e.g. F seeing A's accounts).
      let bestGroup: string[] = [];

      // Check direct group
      if (Array.isArray(groups[userId])) {
        bestGroup = groups[userId];
      }

      if (bestGroup.length === 0) return null;

      // Map IDs to accounts from pool, filtering out missing ones
      const recoveredAccounts = bestGroup
        .map(id => pool[id])
        .filter(acc => acc !== undefined && acc !== null);

      // Sort by lastActive to keep consistent order if needed, or just return as is
      return recoveredAccounts.length > 0 ? recoveredAccounts : null;
    } catch (e) {
      console.error("Error recovering group:", e);
      return null;
    }
  };

  // Save accounts to storage whenever they change
  useEffect(() => {
    if (accounts.length > 0) {
      try {
        const json = JSON.stringify(accounts);
        localStorage.setItem("tedin_accounts", json);
        // Backup to sessionStorage in case localStorage is cleared unexpectedly
        sessionStorage.setItem("tedin_accounts_backup", json);

        // Also update the persistent pool and groups
        updateSessionPoolAndGroups(accounts);
      } catch (e) {
        console.error("Error saving accounts to storage:", e);
      }
    }
  }, [accounts]);

  // Sync current session to accounts list
  useEffect(() => {
    // Prevent syncing while verifying auth callback to avoid adding invalid accounts
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/auth/callback")
    ) {
      return;
    }

    if (user && session && userRole && baseRole) {
      const isAddingAccount =
        localStorage.getItem("isAddingAccount") === "true";
      const addingAccountFrom = localStorage.getItem("addingAccountFrom");

      setAccounts(prev => {
        // 1. Attempt to recover accounts from localStorage (or backup) if state is empty
        let currentAccounts = prev;
        if (currentAccounts.length === 0 && typeof window !== "undefined") {
          const stored = localStorage.getItem("tedin_accounts");
          const backup = sessionStorage.getItem("tedin_accounts_backup");
          const source = stored || backup;

          if (source) {
            try {
              const parsed = JSON.parse(source);
              if (Array.isArray(parsed) && parsed.length > 0) {
                currentAccounts = parsed;
                // Restore to localStorage if it was missing but backup existed
                if (!stored && backup) {
                  localStorage.setItem("tedin_accounts", backup);
                }
              }
            } catch (e) { }
          }
        }

        const existingIndex = currentAccounts.findIndex(
          a => a.user.id === user.id
        );
        const newAccount: StoredAccount = {
          user,
          session,
          role: userRole,
          baseRole,
          lastActive: new Date().toISOString(),
        };

        if (isAddingAccount) {
          // If adding account, preserve existing and add/update new

          // CRITICAL FIX: Always try to recover the parent group when adding an account.
          // This ensures that even if local state is partial, we fetch the full group from the pool.
          if (addingAccountFrom) {
            const parentGroup = recoverGroupForUser(addingAccountFrom);
            if (parentGroup && parentGroup.length > 0) {
              console.log("Recovered parent group from:", addingAccountFrom);

              // Merge parentGroup with currentAccounts to ensure we have everything
              const mergedMap = new Map<string, StoredAccount>();

              // Add recovered accounts first
              parentGroup.forEach(acc => mergedMap.set(acc.user.id, acc));

              // Note: We do NOT merge the new user's existing group here.
              // If F adds B, we want [F, B], not [F, B + B's friends].
              // This ensures isolation as requested.

              // Add/Update with current accounts (which might have fresher session data)
              currentAccounts.forEach(acc => mergedMap.set(acc.user.id, acc));

              currentAccounts = Array.from(mergedMap.values());
            }
          }

          // Recalculate index as currentAccounts might have changed
          const updatedIndex = currentAccounts.findIndex(
            a => a.user.id === user.id
          );

          let finalAccounts: StoredAccount[];
          if (updatedIndex >= 0) {
            const newAccounts = [...currentAccounts];
            newAccounts[updatedIndex] = newAccount;
            finalAccounts = newAccounts;
          } else {
            finalAccounts = [...currentAccounts, newAccount];
          }

          // FORCE SAVE: Save immediately to ensure persistence before any state updates or unmounts
          // This fixes the race condition where C is added but not saved before flags are cleared
          if (typeof window !== "undefined") {
            console.log(
              "Force saving accounts during add:",
              finalAccounts.length
            );
            localStorage.setItem(
              "tedin_accounts",
              JSON.stringify(finalAccounts)
            );
            updateSessionPoolAndGroups(finalAccounts);
          }

          return finalAccounts;
        } else {
          // Normal login (not adding account)
          if (existingIndex >= 0) {
            // User exists in list, update them and keep others
            const newAccounts = [...currentAccounts];
            newAccounts[existingIndex] = newAccount;
            return newAccounts;
          } else {
            // User does not exist in current list and we are not adding.
            // THIS IS THE KEY CHANGE:
            // Instead of just resetting to [newAccount], we try to recover their "Group"

            const recoveredGroup = recoverGroupForUser(user.id);

            if (recoveredGroup) {
              // We found a saved group for this user!
              // We need to make sure the current user in the group is updated with latest session
              const myIndex = recoveredGroup.findIndex(
                a => a.user.id === user.id
              );
              if (myIndex >= 0) {
                recoveredGroup[myIndex] = newAccount;
                return recoveredGroup;
              } else {
                // Should not happen if logic is correct, but fallback
                return [...recoveredGroup, newAccount];
              }
            } else {
              // No group found, this is truly a new/isolated user
              return [newAccount];
            }
          }
        }
      });

      // Consume flag if it was true
      if (isAddingAccount) {
        // Only clear if we are NOT the user who initiated the add (meaning we are the NEW user)
        // OR if we are the same user (re-login), we should also clear it to avoid loops
        // But we need to make sure the account was actually added first.

        // We use a small timeout to ensure the 'accounts' state has updated and
        // the useEffect[accounts] has run to save the data to localStorage.
        setTimeout(() => {
          localStorage.removeItem("isAddingAccount");
          localStorage.removeItem("addingAccountFrom");
        }, 2000);
      }
    }
  }, [user, session, userRole, baseRole]);

  // Multi-account functions
  const switchAccount = async (userId: string) => {
    if (isSwitchingAccount) return; // Prevent double clicks

    // CRITICAL FIX: Ensure current state is persisted before switching
    // This handles cases where the user switches immediately after adding an account
    if (accounts.length > 0) {
      try {
        // Safety check: Ensure current user is included in the saved list
        // This prevents the "disappearing account" bug if state hasn't updated yet
        let accountsToSave = [...accounts];
        if (
          user &&
          session &&
          userRole &&
          baseRole &&
          !accounts.find(a => a.user.id === user.id)
        ) {
          console.log(
            "Current user missing from accounts list during switch, adding temporarily for save..."
          );
          const currentUserAccount: StoredAccount = {
            user: user,
            session: session,
            role: userRole,
            baseRole: baseRole,
            lastActive: new Date().toISOString(),
          };
          accountsToSave.push(currentUserAccount);
        }

        const json = JSON.stringify(accountsToSave);
        localStorage.setItem("tedin_accounts", json);
        sessionStorage.setItem("tedin_accounts_backup", json);
        updateSessionPoolAndGroups(accountsToSave);
      } catch (e) {
        console.error("Error saving accounts before switch:", e);
      }
    }

    // Clear add account flags as we are now manually switching
    localStorage.removeItem("isAddingAccount");
    localStorage.removeItem("addingAccountFrom");

    const targetAccount = accounts.find(a => a.user.id === userId);
    if (!targetAccount) return;

    setIsSwitchingAccount(true);

    try {
      console.log("Switching account to:", userId);

      // Check if token is expired
      const expiresAt = targetAccount.session.expires_at; // timestamp in seconds
      const now = Math.floor(Date.now() / 1000);
      // Add a buffer of 60 seconds to be safe
      const isExpired = !expiresAt || expiresAt - 60 < now;

      let freshSession = targetAccount.session;
      let freshUser = targetAccount.user;

      if (isExpired) {
        console.log("Token expired, attempting refresh...");
        // Always try to set session via Supabase to verify validity and refresh if needed
        const { data, error } = await supabase.auth.setSession({
          access_token: targetAccount.session.access_token,
          refresh_token: targetAccount.session.refresh_token,
        });

        if (error) {
          console.error("Failed to switch session:", error);
          setIsSwitchingAccount(false);

          // แจ้งเตือนผู้ใช้เมื่อไม่สามารถสลับบัญชีได้ (เช่น Token หมดอายุหรือ user ถูกลบ)
          setExpiredAccountEmail(targetAccount.user.email || "");
          setSessionExpiredModalOpen(true);

          // ลบบัญชีที่มีปัญหาออกจากรายการเพื่อไม่ให้กดซ้ำ
          const newAccounts = accounts.filter(a => a.user.id !== userId);
          setAccounts(newAccounts);
          localStorage.setItem("tedin_accounts", JSON.stringify(newAccounts));

          return;
        }

        if (data.session) {
          freshSession = data.session;
          freshUser = data.user || freshUser;
        }
      } else {
        // Token is valid. Perform fast switch.
        console.log("Token valid, performing fast switch...");

        // 1. Find the Supabase auth token key
        let sbKey: string | null = null;
        const prefix = "sb-";
        const suffix = "-auth-token";

        // Helper to find key
        const findKey = (storage: Storage) => {
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(prefix) && key.endsWith(suffix))
              return key;
          }
          return null;
        };

        sbKey = findKey(localStorage) || findKey(sessionStorage);

        // If key not found, try to construct it from env (fallback)
        if (!sbKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          try {
            const hostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
              .hostname;
            const projectRef = hostname.split(".")[0];
            sbKey = `sb-${projectRef}-auth-token`;
          } catch (e) { }
        }

        if (sbKey) {
          // 2. Manually write to storage
          const rememberMe = localStorage.getItem("rememberMe") === "true";
          const targetStorage = rememberMe ? localStorage : sessionStorage;
          const otherStorage = rememberMe ? sessionStorage : localStorage;

          // Clear from other storage
          otherStorage.removeItem(sbKey);
          // Write to target storage
          targetStorage.setItem(sbKey, JSON.stringify(targetAccount.session));

          console.log("Fast switch: Storage updated manually");
        } else {
          // Fallback if key not found: await setSession (slower but safe)
          console.warn(
            "Supabase storage key not found, falling back to setSession"
          );
          await supabase.auth.setSession({
            access_token: targetAccount.session.access_token,
            refresh_token: targetAccount.session.refresh_token,
          });
        }
      }

      // Session set successfully.
      // Update storage manually to ensure persistence across reloads if needed

      // 2. Update storage with the session (Custom keys)
      const rememberMe = localStorage.getItem("rememberMe") === "true";

      if (rememberMe) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", targetAccount.role);
        localStorage.setItem("baseRole", targetAccount.baseRole);
        localStorage.setItem(
          "userData",
          JSON.stringify({
            user: freshUser,
            session: freshSession,
          })
        );
        // Clear session storage to avoid conflicts
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("baseRole");
        sessionStorage.removeItem("userData");
      } else {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", targetAccount.role);
        sessionStorage.setItem("baseRole", targetAccount.baseRole);
        sessionStorage.setItem(
          "userData",
          JSON.stringify({
            user: freshUser,
            session: freshSession,
          })
        );
        // Clear local storage
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userRole");
        localStorage.removeItem("baseRole");
        localStorage.removeItem("userData");
      }

      // 3. Force reload immediately to ensure clean state
      console.log("Reloading page now...");
      window.location.reload();
    } catch (error) {
      console.error("Error switching account:", error);
      setIsSwitchingAccount(false);
      alert("เกิดข้อผิดพลาดในการสลับบัญชี");
    }
  };

  const addAccount = async () => {
    // Save current state before redirecting
    if (user) {
      localStorage.setItem("addingAccountFrom", user.id);
      localStorage.setItem(
        "addingAccountName",
        user.user_metadata?.first_name || user.email || "ผู้ใช้"
      );
    }
    localStorage.setItem("isAddingAccount", "true");

    // Force save accounts to ensure the current session is preserved
    if (accounts.length > 0) {
      try {
        const json = JSON.stringify(accounts);
        localStorage.setItem("tedin_accounts", json);
        sessionStorage.setItem("tedin_accounts_backup", json);
        updateSessionPoolAndGroups(accounts);
      } catch (e) {
        console.error("Error saving accounts before add:", e);
      }
    }

    // DO NOT call supabase.auth.signOut() here because it revokes the current session on the server,
    // making it impossible to switch back to this account later without re-login.
    // Instead, we manually clear the local session storage to simulate a "client-side logout"
    // while keeping the session valid on the server.

    const publicStorageKeys = ["sb-", "supabase.auth.token"];

    const clearTokens = (storage: Storage) => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (
          key &&
          (publicStorageKeys.some(prefix => key.startsWith(prefix)) ||
            key.includes("supabase.auth"))
        ) {
          // Avoid removing super-admin keys if any
          if (!key.includes("super-admin")) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(k => storage.removeItem(k));
    };

    clearTokens(localStorage);
    clearTokens(sessionStorage);

    // Redirect to login with a flag
    window.location.href = "/auth/login?add_account=true";
  };

  const removeAccount = async (userId: string) => {
    const newAccounts = accounts.filter(a => a.user.id !== userId);
    setAccounts(newAccounts);
    localStorage.setItem("tedin_accounts", JSON.stringify(newAccounts));

    // If removing current account, logout or switch to another
    if (user?.id === userId) {
      if (newAccounts.length > 0) {
        await switchAccount(newAccounts[0].user.id);
      } else {
        await logout();
      }
    }
  };

  const reActivateCurrentSession = async (userId: string) => {
    // Re-activate a session by switching to it (similar to switchAccount)
    const targetAccount = accounts.find(a => a.user.id === userId);
    if (!targetAccount) {
      console.error("Account not found:", userId);
      return;
    }

    try {
      console.log("Re-activating session for:", userId);
      await switchAccount(userId);
    } catch (error) {
      console.error("Error re-activating session:", error);
      throw error;
    }
  };

  // Public site roles that should be treated as authenticated in the main app
  const isPublicRole = (role: UserRole | null) =>
    role === "customer" || role === "agent";

  // Helper computed properties
  const isAdmin = userRole === "admin";
  const isSuperAdmin = userRole === "super_admin";

  // Helper function to login user after registration
  const loginUserAfterRegistration = async (
    session: Session | null,
    user: User,
    role: UserRole,
    email?: string,
    password?: string
  ) => {
    try {
      // ถ้ามี session จาก signUp ให้ใช้เลย
      if (session) {
        console.log("✅ Using session from signUp for auto-login");
        // ดึง role จาก database เพื่อความแน่ใจ
        const roleFromDb = await fetchUserRole(user.id);
        const finalRole = (roleFromDb as UserRole) || role || "customer";

        // Set auth state
        setSession(session);
        setUser(user);
        setIsLoggedIn(true);
        setUserRole(finalRole);
        setBaseRole(finalRole); // Set baseRole

        // เก็บใน localStorage (จำฉัน) เพื่อให้เข้าสู่ระบบอัตโนมัติ
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", finalRole);
        localStorage.setItem("baseRole", finalRole); // Store baseRole
        localStorage.setItem(
          "userData",
          JSON.stringify({
            user: user,
            session: session,
          })
        );
        localStorage.setItem("rememberMe", "true"); // ตั้งค่า remember me อัตโนมัติ

        console.log("✅ Auto-login successful after registration");
        return;
      }

      // ถ้าไม่มี session ให้ลองดึง session ใหม่
      console.log("ℹ️ No session from signUp, fetching new session...");
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionData?.session) {
        // มี session จากการดึงมาใหม่
        const roleFromDb = await fetchUserRole(sessionData.session.user.id);
        const finalRole = (roleFromDb as UserRole) || role || "customer";

        setSession(sessionData.session);
        setUser(sessionData.session.user);
        setIsLoggedIn(true);
        setUserRole(finalRole);
        setBaseRole(finalRole); // Set baseRole

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", finalRole);
        localStorage.setItem("baseRole", finalRole); // Store baseRole
        localStorage.setItem(
          "userData",
          JSON.stringify({
            user: sessionData.session.user,
            session: sessionData.session,
          })
        );
        localStorage.setItem("rememberMe", "true");

        console.log("✅ Auto-login successful with new session");
        return;
      }

      // ถ้ายังไม่มี session และมี email/password ให้ลอง login
      if (email && password) {
        console.log(
          "ℹ️ No session available, attempting to login with credentials..."
        );
        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (loginError) {
          console.warn("⚠️ Could not login after registration:", loginError);
          // ถ้า login ไม่สำเร็จ อาจเป็นเพราะต้องยืนยันอีเมลก่อน
          // แต่ยังคงถือว่าสมัครสมาชิกสำเร็จ
          return;
        }

        if (loginData?.session) {
          const roleFromDb = await fetchUserRole(loginData.session.user.id);
          const finalRole = (roleFromDb as UserRole) || role || "customer";

          setSession(loginData.session);
          setUser(loginData.session.user);
          setIsLoggedIn(true);
          setUserRole(finalRole);
          setBaseRole(finalRole); // Set baseRole

          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("userRole", finalRole);
          localStorage.setItem("baseRole", finalRole); // Store baseRole
          localStorage.setItem(
            "userData",
            JSON.stringify({
              user: loginData.session.user,
              session: loginData.session,
            })
          );
          localStorage.setItem("rememberMe", "true");

          console.log(
            "✅ Auto-login successful after registration with credentials"
          );
          return;
        }
      }

      console.warn(
        "⚠️ Could not auto-login after registration, user may need to login manually"
      );
    } catch (error) {
      console.error("❌ Error during auto-login after registration:", error);
      // ไม่ throw error เพื่อไม่ให้การสมัครสมาชิกล้มเหลว
    }
  };

  // Helper: fetch role from public.users by auth user id
  const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .limit(1);
      if (error) return null as any;
      return (data?.[0]?.role as UserRole) || null;
    } catch (_) {
      return null;
    }
  };

  // Helper: check if input is email or phone
  const isEmail = (input: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const getOriginalProvider = async (
    email: string
  ): Promise<"email" | "google" | "line" | null> => {
    try {
      const res = await fetch("/api/auth/check-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return (data?.provider as any) ?? null;
    } catch (_) {
      return null;
    }
  };

  // Helper: find user email by phone number
  const findUserByPhone = async (
    phone: string
  ): Promise<{ email: string; error: any | null }> => {
    try {
      const response = await fetch("/api/get-email-by-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Use the error message from the API response if available
        const message =
          data.error === "Phone number not found"
            ? "ไม่พบเบอร์โทรนี้ในระบบ"
            : data.error || "เกิดข้อผิดพลาดในการค้นหาเบอร์โทร";
        return { email: "", error: { message } };
      }

      return { email: data.email, error: null };
    } catch (error) {
      console.error("Exception finding user by phone:", error);
      return {
        email: "",
        error: { message: "เกิดข้อผิดพลาดในการค้นหาเบอร์โทร" },
      };
    }
  };

  // Check Supabase session and storage on client side only
  useEffect(() => {
    let isMounted = true; // ป้องกัน race condition

    const getInitialSession = async () => {
      try {
        // ✅ ตรวจ sessionStorage (ไม่จำฉัน) ก่อน - เร็วกว่า
        const ssLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
        const ssRole = sessionStorage.getItem("userRole") as UserRole | null;
        const ssBaseRole = sessionStorage.getItem(
          "baseRole"
        ) as UserRole | null; // Get baseRole
        const ssUserData = sessionStorage.getItem("userData");
        if (ssLoggedIn && ssRole && ssUserData && isPublicRole(ssRole)) {
          try {
            const userData = JSON.parse(ssUserData);
            if (isMounted) {
              setIsLoggedIn(true);
              setUserRole(ssRole);
              setBaseRole(ssBaseRole || ssRole); // Set baseRole
              setUser(userData.user);
              setSession(userData.session);
              setLoading(false);
            }
            return;
          } catch (e) {
            // Invalid JSON, continue to next check
          }
        }

        // ถัดไปค่อยดู localStorage ก็ต่อเมื่อเลือกจำฉัน
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        const userLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        const storedUserRole = localStorage.getItem(
          "userRole"
        ) as UserRole | null;
        const storedBaseRole = localStorage.getItem(
          "baseRole"
        ) as UserRole | null; // Get baseRole
        const storedUserData = localStorage.getItem("userData");

        if (
          rememberMe &&
          userLoggedIn &&
          storedUserRole &&
          isPublicRole(storedUserRole) &&
          storedUserData
        ) {
          // ถ้ามีข้อมูลใน localStorage ครบ ให้ใช้เลย (เร็วที่สุด)
          const userData = JSON.parse(storedUserData);
          if (isMounted) {
            setIsLoggedIn(true);
            setUserRole(storedUserRole);
            setBaseRole(storedBaseRole || storedUserRole); // Set baseRole
            setUser(userData.user);
            setSession(userData.session);
            setLoading(false);
          }
          return;
        }

        // ถ้าไม่มีข้อมูลใน localStorage ให้เช็ค Supabase
        const { data } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session?.user) {
          const rememberMe = localStorage.getItem("rememberMe") === "true";
          const cachedRole = rememberMe
            ? (localStorage.getItem("userRole") as UserRole | null)
            : (sessionStorage.getItem("userRole") as UserRole | null);

          const roleFromDb = await fetchUserRole(data.session.user.id);

          // Determine base role (from DB)
          const cachedBaseRole = rememberMe
            ? (localStorage.getItem("baseRole") as UserRole | null)
            : (sessionStorage.getItem("baseRole") as UserRole | null);

          const finalBaseRole =
            (roleFromDb as UserRole) || cachedBaseRole || "customer";

          // Determine active role - Always use base role (removed role switching)
          let finalRole = finalBaseRole;

          if (isMounted) {
            if (isPublicRole(finalRole)) {
              setIsLoggedIn(true);
              setUserRole(finalRole);
              setBaseRole(finalBaseRole); // Set baseRole
              // ถ้าไม่ได้เลือกจำฉัน ให้เก็บใน sessionStorage แทน
              const remember = localStorage.getItem("rememberMe") === "true";
              if (remember) {
                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("userRole", finalRole);
                localStorage.setItem("baseRole", finalBaseRole); // Store baseRole
                localStorage.setItem(
                  "userData",
                  JSON.stringify({
                    user: data.session.user,
                    session: data.session,
                  })
                );
              } else {
                sessionStorage.setItem("isLoggedIn", "true");
                sessionStorage.setItem("userRole", finalRole);
                sessionStorage.setItem("baseRole", finalBaseRole); // Store baseRole
                sessionStorage.setItem(
                  "userData",
                  JSON.stringify({
                    user: data.session.user,
                    session: data.session,
                  })
                );
              }
            } else {
              // Admin/super_admin sessions should not authenticate the public site
              setIsLoggedIn(false);
              setUserRole(null);
              setBaseRole(null);
              setUser(null);
              // Do not persist admin login to public storage
              localStorage.removeItem("isLoggedIn");
              localStorage.removeItem("userRole");
              localStorage.removeItem("baseRole");
              localStorage.removeItem("userData");
              sessionStorage.removeItem("isLoggedIn");
              sessionStorage.removeItem("userRole");
              sessionStorage.removeItem("baseRole");
              sessionStorage.removeItem("userData");
            }
          }
        } else {
          // No session, clear everything
          if (isMounted) {
            setIsLoggedIn(false);
            setUserRole(null);
            setBaseRole(null);
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("userRole");
            localStorage.removeItem("baseRole");
            localStorage.removeItem("userData");
            sessionStorage.removeItem("isLoggedIn");
            sessionStorage.removeItem("userRole");
            sessionStorage.removeItem("baseRole");
            sessionStorage.removeItem("userData");
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error getting auth status:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!isMounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const rememberMe = localStorage.getItem("rememberMe") === "true";
          const cachedRole = rememberMe
            ? (localStorage.getItem("userRole") as UserRole | null)
            : (sessionStorage.getItem("userRole") as UserRole | null);

          const roleFromDb = await fetchUserRole(newSession.user.id);

          // Determine base role (from DB)
          const cachedBaseRole = rememberMe
            ? (localStorage.getItem("baseRole") as UserRole | null)
            : (sessionStorage.getItem("baseRole") as UserRole | null);

          const finalBaseRole =
            (roleFromDb as UserRole) || cachedBaseRole || "customer";

          // Determine active role - Always use base role (removed role switching)
          let finalRole = finalBaseRole;

          if (isPublicRole(finalRole)) {
            setIsLoggedIn(true);
            setUserRole(finalRole);
            setBaseRole(finalBaseRole);

            if (rememberMe) {
              localStorage.setItem("isLoggedIn", "true");
              localStorage.setItem("userRole", finalRole);
              localStorage.setItem("baseRole", finalBaseRole);
              localStorage.setItem(
                "userData",
                JSON.stringify({
                  user: newSession.user,
                  session: newSession,
                })
              );
            } else {
              sessionStorage.setItem("isLoggedIn", "true");
              sessionStorage.setItem("userRole", finalRole);
              sessionStorage.setItem("baseRole", finalBaseRole);
              sessionStorage.setItem(
                "userData",
                JSON.stringify({
                  user: newSession.user,
                  session: newSession,
                })
              );
            }
          } else {
            // Ignore admin-only sessions for public app
            setIsLoggedIn(false);
            setUserRole(null);
            setBaseRole(null);
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("userRole");
            localStorage.removeItem("baseRole");
            localStorage.removeItem("userData");
            sessionStorage.removeItem("isLoggedIn");
            sessionStorage.removeItem("userRole");
            sessionStorage.removeItem("baseRole");
            sessionStorage.removeItem("userData");
          }
        } else {
          setIsLoggedIn(false);
          setUserRole(null);
          setBaseRole(null);
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("userRole");
          localStorage.removeItem("baseRole");
          localStorage.removeItem("userData");
          sessionStorage.removeItem("isLoggedIn");
          sessionStorage.removeItem("userRole");
          sessionStorage.removeItem("baseRole");
          sessionStorage.removeItem("userData");
        }
      }
    );
  }, []);

  // Finalize registration after successful phone OTP login
  const finalizeRegistration = async ({
    firstName,
    lastName,
    email,
    phone,
    password,
    role = "customer",
  }: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
  }) => {
    try {
      console.log("🔄 เริ่มสร้างบัญชีผู้ใช้หลังยืนยัน OTP...");

      // ตรวจสอบว่ายืนยัน OTP แล้ว
      const tempAuth = localStorage.getItem("tempPhoneAuth");
      if (tempAuth !== phone) {
        return { error: { message: "ยังไม่ได้ยืนยัน OTP หรือเบอร์ไม่ตรงกัน" } };
      }

      const original = await getOriginalProvider(email);
      if (original && original !== "email") {
        return {
          error: {
            message:
              original === "google"
                ? "บัญชีนี้สมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google"
                : "บัญชีนี้สมัครด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE",
          },
        } as any;
      }

      // สร้างผู้ใช้ด้วย Supabase Auth (ใช้ email/password)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            role,
          },
        },
      });

      if (authError) {
        console.error("❌ Auth signup error:", authError);
        // ปิด flow ทันทีเมื่อสมัครไม่สำเร็จ โดยเฉพาะกรณีอีเมลถูกใช้แล้ว
        const message =
          (authError as any)?.message ||
          (typeof authError === "string" ? authError : "สมัครสมาชิกไม่สำเร็จ");
        return {
          error: {
            message,
            code: (authError as any)?.status || (authError as any)?.code,
          },
        } as any;
      }

      if (!authData.user) {
        return { error: { message: "ไม่สามารถสร้างบัญชีได้" } };
      }

      console.log("✅ สร้าง Auth User สำเร็จ:", authData.user.id);

      // ตรวจสอบว่ามี user record ใน users table แล้วหรือไม่
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id, email")
        .eq("id", authData.user.id)
        .maybeSingle();

      // ถ้ามี user record อยู่แล้ว (อาจเป็นเพราะถูกสร้างไปแล้วจากการเรียกซ้ำ)
      // ให้ข้ามการสร้าง record ใหม่
      if (existingUser) {
        console.log("ℹ️ User record already exists, skipping insert");
        // ตรวจสอบว่ามี role-specific record หรือไม่
        // ถ้าไม่มี ให้สร้าง
        await createRoleSpecificRecord(authData.user.id, role, {
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
        });

        // ล้าง temp auth
        localStorage.removeItem("tempPhoneAuth");

        // เข้าสู่ระบบอัตโนมัติด้วย session ที่มี
        await loginUserAfterRegistration(
          authData.session,
          authData.user,
          role,
          email,
          password
        );

        console.log(
          "✅ สมัครสมาชิกสำเร็จและเข้าสู่ระบบอัตโนมัติ (user record already existed)"
        );
        return { error: null };
      }

      // Insert ข้อมูลใน users table (ใช้ insert แทน upsert เพื่อป้องกัน duplicate)
      const now = new Date().toISOString();
      const { error: usersInsertError } = await supabase.from("users").insert({
        id: authData.user.id,
        role,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        created_at: now,
        updated_at: now,
      });

      if (usersInsertError) {
        console.error("❌ users insert error:", usersInsertError);

        // ถ้าเป็น duplicate key error อาจหมายความว่าถูกสร้างไปแล้ว
        if (usersInsertError.code === "23505") {
          // ตรวจสอบอีกครั้งว่ามี user record อยู่แล้วหรือไม่
          const { data: checkUser } = await supabase
            .from("users")
            .select("id")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (checkUser) {
            // User record มีอยู่แล้ว ให้ถือว่าสำเร็จ
            console.log(
              "ℹ️ User record exists after duplicate error, treating as success"
            );

            // ตรวจสอบว่ามี role-specific record หรือไม่
            await createRoleSpecificRecord(authData.user.id, role, {
              first_name: firstName,
              last_name: lastName,
              phone,
              email,
            });

            // ล้าง temp auth
            localStorage.removeItem("tempPhoneAuth");

            // เข้าสู่ระบบอัตโนมัติด้วย session ที่มี
            await loginUserAfterRegistration(
              authData.session,
              authData.user,
              role,
              email,
              password
            );

            console.log(
              "✅ สมัครสมาชิกสำเร็จและเข้าสู่ระบบอัตโนมัติ (handled duplicate key error)"
            );
            return { error: null };
          }

          // ถ้าไม่มี user record จริงๆ แสดงว่าเป็น error จริง
          if (usersInsertError.message.includes("users_email_key")) {
            return {
              error: {
                message:
                  "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ",
              },
            };
          }
          return {
            error: { message: "ข้อมูลนี้ถูกใช้งานแล้ว กรุณาตรวจสอบและลองใหม่" },
          };
        }

        return {
          error: {
            message: usersInsertError.message || "ไม่สามารถสร้างบัญชีผู้ใช้ได้",
          },
        };
      } else {
        console.log("✅ Users table created successfully");
      }

      // สร้างเรกคอร์ดตาม role
      await createRoleSpecificRecord(authData.user.id, role, {
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
      });

      // ล้าง temp auth
      localStorage.removeItem("tempPhoneAuth");

      // เข้าสู่ระบบอัตโนมัติด้วย session ที่ได้จาก signUp
      await loginUserAfterRegistration(
        authData.session,
        authData.user,
        role,
        email,
        password
      );

      console.log("✅ สมัครสมาชิกสำเร็จและเข้าสู่ระบบอัตโนมัติ");
      return { error: null };
    } catch (error) {
      console.error("❌ finalizeRegistration error:", error);
      return { error } as any;
    }
  };

  // Create role-specific record in appropriate table
  const createRoleSpecificRecord = async (
    userId: string,
    role: string,
    metadata: any
  ) => {
    try {
      if (role === "customer") {
        const { error } = await supabase.from("customers").insert({
          user_id: userId,
          full_name:
            `${metadata?.first_name || ""} ${metadata?.last_name || ""}`.trim(),
          created_at: new Date().toISOString(),
        });

        if (error && !error.message.includes("duplicate")) {
          console.error("❌ Failed to create customer record:", error);
        } else {
          console.log("✅ Customer record created");
        }
      } else if (role === "agent") {
        const { error } = await supabase.from("agens").insert({
          user_id: userId,
          company_name: "",
          business_license_id: "",
          address: "",
          property_types: [], // Required field
          service_areas: [], // Required field
          created_at: new Date().toISOString(),
        });

        if (error && !error.message.includes("duplicate")) {
          console.error("❌ Failed to create agent record:", {
            message: error.message,
            code: error.code,
            details: error.details,
          });
        } else {
          console.log("✅ Agent record created");
        }
      } else if (role === "admin") {
        const { error } = await supabase.from("admins").insert({
          user_id: userId,
          username: metadata?.email || "",
          admin_password:
            "change_me_" + Math.random().toString(36).substring(7),
        });

        if (error && !error.message.includes("duplicate")) {
          console.error("❌ Failed to create admin record:", error);
        } else {
          console.log("✅ Admin record created");
        }
      }
    } catch (error: any) {
      console.error("❌ Role-specific record creation error:", {
        message: error?.message || "Unknown error",
        code: error?.code,
        details: error?.details,
      });
      throw error; // Re-throw เพื่อให้ calling function handle ได้
    }
  };

  // Ensure role-specific record exists
  const ensureRoleSpecificRecord = async (
    userId: string,
    role: string,
    metadata: any
  ) => {
    try {
      let recordExists = false;

      if (role === "customer") {
        const { data, error } = await supabase
          .from("customers")
          .select("user_id")
          .eq("user_id", userId)
          .single();

        recordExists = !error && !!data;
      } else if (role === "agent") {
        const { data, error } = await supabase
          .from("agens")
          .select("user_id")
          .eq("user_id", userId)
          .single();

        recordExists = !error && !!data;
      } else if (role === "admin") {
        const { data, error } = await supabase
          .from("admins")
          .select("user_id")
          .eq("user_id", userId)
          .single();

        recordExists = !error && !!data;
      }

      if (!recordExists) {
        console.log(`🔄 Creating missing ${role} record...`);
        await createRoleSpecificRecord(userId, role, metadata);
      }
    } catch (error) {
      console.error("❌ Role-specific record check error:", error);
    }
  };

  // Login function using Supabase with auto-sync
  // Supports both email and phone number login
  // For phone login, requires OTP verification first
  const login = async (
    emailOrPhone: string,
    password: string,
    rememberMe: boolean = false
  ) => {
    try {
      let email = emailOrPhone;
      let isPhoneLogin = false;
      let cleanPhone = "";

      // ตรวจสอบว่าผู้ใช้กรอกอีเมลหรือเบอร์โทร
      if (!isEmail(emailOrPhone)) {
        // ถ้าไม่ใช่ email แสดงว่าเป็นเบอร์โทร
        isPhoneLogin = true;
        cleanPhone = emailOrPhone.replace(/[^0-9]/g, "").slice(0, 10);

        console.log("📱 Detected phone number login, searching for email...");
        const { email: userEmail, error: phoneError } =
          await findUserByPhone(emailOrPhone);

        if (phoneError) {
          console.error("❌ Phone lookup error:", phoneError);
          return { error: phoneError };
        }

        if (!userEmail) {
          return {
            error: {
              message: "ไม่พบเบอร์โทรนี้ในระบบ กรุณาตรวจสอบและลองอีกครั้ง",
            },
          };
        }

        email = userEmail;
        console.log("✅ Found email for phone:", email);

        const provider = await getOriginalProvider(email);
        if (provider && provider !== "email") {
          return {
            error: {
              message:
                provider === "google"
                  ? "บัญชีนี้สมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google"
                  : "บัญชีนี้สมัครด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE",
            },
          } as any;
        }
      }

      // สำหรับ email login ใช้ login ตรงโดยไม่ต้อง OTP
      // ใช้ email ที่ได้มาทำการ login
      {
        const provider = await getOriginalProvider(email);
        if (provider && provider !== "email") {
          return {
            error: {
              message:
                provider === "google"
                  ? "บัญชีนี้สมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google"
                  : "บัญชีนี้สมัครด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE",
            },
          } as any;
        }
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // จัดการ expected auth errors ด้วย console.warn แทน console.error
        if (error.message.includes("Invalid login credentials")) {
          console.warn("⚠️ Login failed: Invalid credentials");
          return { error };
        }

        // จัดการกับ email confirmation error
        if (error.message.includes("Email not confirmed")) {
          console.warn("⚠️ Login failed: Email not confirmed");
          console.log("📧 Attempting to resend confirmation...");

          // ลองส่ง confirmation email อีกครั้ง
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email: email,
          });

          if (resendError) {
            console.error("❌ Resend confirmation error:", resendError);
            return {
              error: {
                message: "กรุณายืนยันอีเมลก่อนล็อกอิน หรือติดต่อผู้ดูแลระบบ",
                requiresConfirmation: true,
              },
            };
          } else {
            return {
              error: {
                message:
                  "ส่งลิงก์ยืนยันอีเมลไปแล้ว กรุณาตรวจสอบกล่องจดหมายและคลิกลิงก์เพื่อยืนยัน",
                requiresConfirmation: true,
              },
            };
          }
        }

        // สำหรับ unexpected errors ใช้ console.error
        console.error("❌ Unexpected Supabase Auth error:", error);
        return { error };
      }

      if (!data.user) {
        return { error: { message: "ไม่พบข้อมูลผู้ใช้" } };
      }

      console.log("🔐 Supabase Auth successful for:", data.user.email);

      const cachedRole = localStorage.getItem("userRole") as UserRole | null;
      const roleFromDb = await fetchUserRole(data.user.id);
      const role = (roleFromDb as UserRole) || cachedRole || "customer";
      const baseRole = (roleFromDb as UserRole) || role;

      // Prevent admins from logging in via public forms; require super-admin login page
      if (!isPublicRole(role)) {
        await supabase.auth.signOut();
        return {
          error: {
            message:
              "สำหรับผู้ดูแลระบบ กรุณาล็อกอินผ่านหน้า /super-admin-login เท่านั้น",
          },
        } as any;
      }

      // เก็บสถานะตามตัวเลือก rememberMe
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", role);
        localStorage.setItem("baseRole", baseRole); // Store baseRole
        localStorage.setItem(
          "userData",
          JSON.stringify({
            user: data.user,
            session: data.session,
          })
        );
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("baseRole");
        sessionStorage.removeItem("userData");
      } else {
        localStorage.setItem("rememberMe", "false");
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", role);
        sessionStorage.setItem("baseRole", baseRole); // Store baseRole
        sessionStorage.setItem(
          "userData",
          JSON.stringify({
            user: data.user,
            session: data.session,
          })
        );
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userRole");
        localStorage.removeItem("baseRole");
        localStorage.removeItem("userData");
      }

      setIsLoggedIn(true);
      setUserRole(role);
      setBaseRole(baseRole); // Set baseRole
      setUser(data.user);
      setSession(data.session);

      console.log("✅ Login successful:", {
        email: data.user.email,
        role: role,
        userId: data.user.id,
      });

      return { error: null };
    } catch (error) {
      console.error("❌ Login error:", error);
      return { error };
    }
  };

  // Login after OTP verification (for phone login)
  const loginAfterOtpVerification = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ) => {
    try {
      {
        const provider = await getOriginalProvider(email);
        if (provider && provider !== "email") {
          return {
            error: {
              message:
                provider === "google"
                  ? "บัญชีนี้สมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google"
                  : "บัญชีนี้สมัครด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE",
            },
          } as any;
        }
      }
      // ใช้ email และ password ทำการ login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // จัดการ expected auth errors
        if (error.message.includes("Invalid login credentials")) {
          console.warn("⚠️ Login after OTP failed: Invalid credentials");
          return { error };
        }

        // จัดการกับ email confirmation error
        if (error.message.includes("Email not confirmed")) {
          console.warn("⚠️ Login after OTP failed: Email not confirmed");
          return {
            error: {
              message: "กรุณายืนยันอีเมลก่อนล็อกอิน หรือติดต่อผู้ดูแลระบบ",
              requiresConfirmation: true,
            },
          };
        }

        console.error("❌ Unexpected Supabase Auth error after OTP:", error);
        return { error };
      }

      if (!data.user) {
        return { error: { message: "ไม่พบข้อมูลผู้ใช้" } };
      }

      console.log(
        "🔐 Supabase Auth successful after OTP for:",
        data.user.email
      );

      const cachedRole = localStorage.getItem("userRole") as UserRole | null;
      const roleFromDb = await fetchUserRole(data.user.id);
      const role = (roleFromDb as UserRole) || cachedRole || "customer";
      const baseRole = (roleFromDb as UserRole) || role;

      // Prevent admins from logging in via public forms
      if (!isPublicRole(role)) {
        await supabase.auth.signOut();
        return {
          error: {
            message:
              "สำหรับผู้ดูแลระบบ กรุณาล็อกอินผ่านหน้า /super-admin-login เท่านั้น",
          },
        } as any;
      }

      // เก็บสถานะตามตัวเลือก rememberMe
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", role);
        localStorage.setItem("baseRole", baseRole); // Store baseRole
        localStorage.setItem(
          "userData",
          JSON.stringify({
            user: data.user,
            session: data.session,
          })
        );
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("baseRole");
        sessionStorage.removeItem("userData");
      } else {
        localStorage.setItem("rememberMe", "false");
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", role);
        sessionStorage.setItem("baseRole", baseRole); // Store baseRole
        sessionStorage.setItem(
          "userData",
          JSON.stringify({
            user: data.user,
            session: data.session,
          })
        );
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userRole");
        localStorage.removeItem("baseRole");
        localStorage.removeItem("userData");
      }

      setIsLoggedIn(true);
      setUserRole(role);
      setBaseRole(baseRole); // Set baseRole
      setUser(data.user);
      setSession(data.session);

      // ลบ tempPhoneAuth ออกหลังจาก login สำเร็จ
      localStorage.removeItem("tempPhoneAuth");

      console.log("✅ Login after OTP successful:", {
        email: data.user.email,
        role: role,
        userId: data.user.id,
      });

      return { error: null };
    } catch (error) {
      console.error("❌ Login after OTP error:", error);
      return { error };
    }
  };

  // Google OAuth login function
  const loginWithGoogle = async () => {
    try {
      console.log("🔐 เริ่ม Google OAuth login...");
      console.log("Current origin:", window.location.origin);
      console.log("Redirect URL:", `${window.location.origin}/auth/callback`);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      console.log("OAuth response:", { data, error });

      if (error) {
        console.error("❌ Google OAuth error:", error);
        return { error };
      }

      console.log("✅ Google OAuth redirect initiated");
      return { error: null };
    } catch (error) {
      console.error("❌ Google OAuth exception:", error);
      return { error };
    }
  };

  // LINE OAuth login function
  const loginWithLine = async () => {
    try {
      console.log("🔐 เริ่ม LINE OAuth login...");
      console.log("Current origin:", window.location.origin);

      // Redirect to LINE OAuth endpoint
      window.location.href = "/api/auth/line";

      return { error: null };
    } catch (error) {
      console.error("❌ LINE OAuth exception:", error);
      return { error };
    }
  };

  // Login with OTP function (send SMS OTP via API)
  const loginWithOtp = async (phone: string) => {
    try {
      console.log("📱 ส่ง OTP ผ่าน API...");

      const response = await fetch("/api/send-otp-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ OTP sent via API:", data.verificationSid);
        return { error: null };
      } else {
        console.error("❌ API OTP failed:", data.error);
        return { error: { message: data.error } };
      }
    } catch (error) {
      console.error("OTP request exception:", error);
      return { error } as any;
    }
  };

  // Verify OTP function (verify SMS OTP with API)
  const verifyOtp = async (phone: string, otp: string) => {
    try {
      console.log("🔐 ยืนยัน OTP ผ่าน API...");

      const response = await fetch("/api/verify-otp-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, code: otp }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ OTP verified successfully via API");

        // เก็บสถานะยืนยัน OTP ชั่วคราวเท่านั้น ไม่ล็อกอินอัตโนมัติ
        localStorage.setItem("tempPhoneAuth", phone);

        return { error: null };
      } else {
        console.error("❌ API OTP verification failed:", data.error);
        return { error: { message: data.error } };
      }
    } catch (error) {
      console.error("OTP verification exception:", error);
      return { error } as any;
    }
  };

  // Logout function - Simple and reliable
  const logout = async () => {
    try {
      console.log("[LOGOUT] Starting logout process");

      // 1. Reset React state immediately (don't wait for backend)
      console.log("[LOGOUT] Resetting React state");
      setIsLoggedIn(false);
      setUserRole(null);
      setBaseRole(null);
      setUser(null);
      setSession(null);
      setAccounts([]);

      // 2. Clear localStorage
      console.log("[LOGOUT] Clearing localStorage");
      const localStorageKeys = [
        "isLoggedIn",
        "userRole",
        "baseRole",
        "userData",
        "rememberMe",
        "tedin_accounts",
        "isAddingAccount",
        "addingAccountFrom",
        "property-data-cache",
        "property-data-cache-expiry",
        "tedin_session_state",
        "dashboard-account-cache-v1",
      ];
      localStorageKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`[LOGOUT] Failed to remove localStorage key: ${key}`, e);
        }
      });

      // 3. Clear sessionStorage
      console.log("[LOGOUT] Clearing sessionStorage");
      const sessionStorageKeys = [
        "isLoggedIn",
        "userRole",
        "baseRole",
        "userData",
        "tedin_session_state",
      ];
      sessionStorageKeys.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.warn(`[LOGOUT] Failed to remove sessionStorage key: ${key}`, e);
        }
      });

      // 4. SignOut from Supabase backend (async, don't wait)
      console.log("[LOGOUT] Signing out from Supabase (async)");
      supabase.auth.signOut().catch((err: any) => {
        console.warn("[LOGOUT] Supabase signOut error (non-blocking):", err);
      });

      console.log("[LOGOUT] Logout completed successfully");
    } catch (error) {
      console.error("[LOGOUT] Logout error:", error);
      // Even if there's an error, still reset state
      setIsLoggedIn(false);
      setUserRole(null);
      setBaseRole(null);
      setUser(null);
      setSession(null);
      setAccounts([]);
      throw error;
    }
  };

  // หมายเหตุ: ไม่ sign out บน beforeunload เพื่อให้รีเฟรช (F5) ไม่หลุดเซสชัน

  // Send password reset OTP
  const sendPasswordResetOtp = async (email: string) => {
    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "เกิดข้อผิดพลาดในการส่งอีเมล" };
      }
      return {
        error: null,
      };
    } catch (error) {
      console.error("Send password reset OTP error:", error);
      return { error: "เกิดข้อผิดพลาดในการส่งอีเมล" };
    }
  };

  // Verify password reset OTP
  const verifyPasswordResetOtp = async (email: string, otp: string) => {
    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otpCode: otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "รหัส OTP ไม่ถูกต้อง" };
      }

      return {
        error: null,
        resetToken: data.resetToken,
      };
    } catch (error) {
      console.error("Verify password reset OTP error:", error);
      return { error: "เกิดข้อผิดพลาดในการยืนยัน OTP" };
    }
  };

  // Reset password
  const resetPassword = async (
    email: string,
    resetToken: string,
    newPassword: string
  ) => {
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, resetToken, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" };
      }

      return { error: null };
    } catch (error) {
      console.error("Reset password error:", error);
      return { error: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        userRole,
        baseRole, // Added baseRole
        isAdmin,
        isSuperAdmin,
        setIsLoggedIn,
        setUserRole,

        accounts,
        switchAccount,
        addAccount,
        removeAccount,
        reActivateCurrentSession,

        setUser,
        setSession,
        login,
        loginAfterOtpVerification,
        loginWithGoogle,
        loginWithLine,
        loginWithOtp,
        verifyOtp,
        finalizeRegistration,
        sendPasswordResetOtp,
        verifyPasswordResetOtp,
        resetPassword,
        logout,
        user,
        session,
        loading,
      }}
    >
      {isSwitchingAccount && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">
            กำลังสลับบัญชี...
          </p>
        </div>
      )}

      <Dialog
        open={sessionExpiredModalOpen}
        onOpenChange={setSessionExpiredModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              ไม่สามารถสลับบัญชีได้
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              ไม่สามารถเข้าถึงบัญชี{" "}
              <span className="font-medium text-foreground">
                {expiredAccountEmail}
              </span>{" "}
              ได้ เนื่องจากเซสชันหมดอายุหรือบัญชีอาจถูกลบออกจากระบบ
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2 py-2 text-center text-sm text-muted-foreground">
            <p>กรุณากดปุ่มด้านล่างเพื่อเข้าสู่ระบบใหม่อีกครั้ง</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setSessionExpiredModalOpen(false);
                addAccount();
              }}
            >
              ตกลง (เพิ่มบัญชีใหม่)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
