"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { supabase } from "@/lib/supabase";
import {
  computeInitials,
  deriveAvatarTheme,
  pickDeterministicColor,
} from "@/utils/avatar-colors";
import {
  BadgeCheck,
  Bell,
  Building,
  Pencil,
  Shield,
  User,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EditFirstNameDialog } from "../../../components/popup/edit-first-name-dialog";
import { EditLastNameDialog } from "../../../components/popup/edit-last-name-dialog";
import { EditPhoneDialog } from "../../../components/popup/edit-phone-dialog";

export default function AccountPage() {
  const { user, isLoggedIn, loading: authLoading, userRole } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [initialCache] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("dashboard-account-cache-v1");
      return cached
        ? (JSON.parse(cached) as {
            profile?: typeof profile;
            agent?: typeof agent;
            customer?: typeof customer;
          })
        : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!initialCache?.profile);
  const [profile, setProfile] = useState<{
    role?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  }>(initialCache?.profile || {});
  const [agent, setAgent] = useState<any | null>(initialCache?.agent ?? null);
  const [agentLoading, setAgentLoading] = useState(
    initialCache?.agent === undefined
  );
  const [customer, setCustomer] = useState<any | null>(
    initialCache?.customer ?? null
  );
  const [customerLoading, setCustomerLoading] = useState(
    initialCache?.customer === undefined
  );
  const [activeBoosts, setActiveBoosts] = useState(0);
  const [openFirst, setOpenFirst] = useState(false);
  const [openLast, setOpenLast] = useState(false);
  const [openPhone, setOpenPhone] = useState(false);
  const [avatarColor, setAvatarColor] = useState("#60a5fa");
  const CACHE_KEY = "dashboard-account-cache-v1";
  const [hasCachedProfile] = useState(Boolean(initialCache?.profile));

  const persistCache = (next?: {
    profile?: typeof profile;
    agent?: typeof agent;
    customer?: typeof customer;
  }) => {
    try {
      const payload = {
        profile: next?.profile ?? profile,
        agent: next?.agent ?? agent,
        customer: next?.customer ?? customer,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore cache errors
    }
  };

  // ตรวจสอบ auth state และ redirect ถ้าไม่ได้ login
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return;

      // ตรวจสอบ session จาก Supabase โดยตรงเพื่อป้องกัน cache
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !isLoggedIn) {
        // ใช้ replace เพื่อป้องกัน back button
        router.replace("/");
        return;
      }
    };

    checkAuth();

    // ตรวจสอบอีกครั้งเมื่อกลับมาที่หน้า (เช่น หลังกด back button)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      if (!hasCachedProfile) setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role, first_name, last_name, email, phone")
          .eq("id", user.id)
          .single();

        if (error) {
          // Ignore "Row not found" error (PGRST116)
          if (error.code !== "PGRST116") {
            console.error("Error fetching profile:", error);
          }
        } else if (mounted) {
          setProfile(data || {});
          persistCache({ profile: data || {} });
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchAgent = async () => {
      if (!user?.id) {
        setAgentLoading(false);
        return;
      }
      if (!hasCachedProfile) setAgentLoading(true);
      try {
        const { data, error } = await supabase
          .from("agens")
          .select(
            `company_name,license_number,business_license_id,address,property_types,service_areas,verification_documents,status,created_at,updated_at,approved_at,approved_by,rejection_reason,profile_picture`
          )
          .eq("user_id", user.id)
          .single();
        if (!mounted) return;
        if (error && error.code !== "PGRST116") {
          console.error("Error fetching agent:", error);
        }
        setAgent(data || null);
        persistCache({ agent: data || null });
      } catch (err) {
        console.error("Fetch agent error:", err);
      } finally {
        if (mounted) setAgentLoading(false);
      }
    };

    const fetchCustomer = async () => {
      if (!user?.id) {
        setCustomerLoading(false);
        return;
      }
      if (!hasCachedProfile) setCustomerLoading(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select(
            `address,preferred_location,budget_range,interested_property_types,created_at,profile_picture,full_name`
          )
          .eq("user_id", user.id)
          .single();
        if (!mounted) return;
        if (error && error.code !== "PGRST116") {
          console.error("Error fetching customer:", error);
        }
        setCustomer(data || null);
        persistCache({ customer: data || null });
      } catch (err) {
        console.error("Fetch customer error:", err);
      } finally {
        if (mounted) setCustomerLoading(false);
      }
    };

    fetchProfile();
    fetchAgent();
    fetchCustomer();

    return () => {
      mounted = false;
    };
  }, [user?.id, hasCachedProfile]);

  // Separate effect for boosts to ensure it's always fresh and not tied to profile caching logic
  useEffect(() => {
    if (!user?.id) return;

    const fetchBoosts = async () => {
      try {
        // Query property_payments instead of properties to reflect actual payment status
        // This ensures that if a payment is deleted/refunded, the badge updates immediately
        const { count, error } = await supabase
          .from("property_payments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "successful");

        if (!error) {
          setActiveBoosts(count || 0);
        } else {
          // Fallback to properties table if property_payments is not accessible (e.g. RLS issues)
          console.warn(
            "Could not fetch payments, falling back to properties status",
            error
          );
          const { count: propCount, error: propError } = await supabase
            .from("properties")
            .select("*", { count: "exact", head: true })
            .eq("agent_id", user.id)
            .eq("is_promoted", true);

          if (!propError) {
            setActiveBoosts(propCount || 0);
          }
        }
      } catch (err) {
        console.error("Fetch boosts error:", err);
      }
    };

    fetchBoosts();

    // Refetch on window focus to keep in sync with DB changes (e.g. manual edits)
    const onFocus = () => fetchBoosts();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id]);

  const metadataFirstName = (user?.user_metadata?.first_name as string) || "";
  const metadataLastName = (user?.user_metadata?.last_name as string) || "";
  const metadataEmail =
    user?.email || (user?.user_metadata?.email as string) || "";

  const profileImage: string | undefined =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    agent?.profile_picture ||
    customer?.profile_picture ||
    undefined;
  const fullName = `${profile.first_name || metadataFirstName || ""} ${
    profile.last_name || metadataLastName || ""
  }`.trim();
  const initials = useMemo(
    () =>
      computeInitials(
        fullName || undefined,
        profile.first_name || metadataFirstName || undefined,
        profile.last_name || metadataLastName || undefined,
        profile.email || metadataEmail || undefined
      ) || (metadataEmail ? metadataEmail[0]?.toUpperCase() : ""),
    [
      fullName,
      profile.email,
      profile.first_name,
      profile.last_name,
      metadataEmail,
      metadataFirstName,
      metadataLastName,
    ]
  );

  const derivedAvatarTheme = useMemo(
    () => deriveAvatarTheme(avatarColor),
    [avatarColor]
  );

  // Ensure every account gets a consistent colored avatar background (matches logout modal)
  useEffect(() => {
    if (!user?.id) return;
    const customColor =
      (user.user_metadata?.avatar_color as string) ||
      (user.user_metadata?.color as string);
    if (customColor && /^#?[0-9a-fA-F]{6}$/.test(customColor)) {
      setAvatarColor(
        customColor.startsWith("#") ? customColor : `#${customColor}`
      );
    } else {
      const seed =
        user.id ||
        fullName ||
        profile.email ||
        `${profile.first_name || ""}${profile.last_name || ""}` ||
        "user";
      setAvatarColor(pickDeterministicColor(seed));
    }
  }, [
    user?.id,
    user?.user_metadata,
    fullName,
    profile.email,
    profile.first_name,
    profile.last_name,
  ]);

  const InfoRow = ({
    label,
    value,
    onEdit,
    isLink = false,
    href = "#",
  }: {
    label: string;
    value: string | null | undefined;
    onEdit?: () => void;
    isLink?: boolean;
    href?: string;
  }) => (
    <div className="flex justify-between items-center py-3 border-b">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        {isLink && value ? (
          <a href={href} className="text-sm text-indigo-600 hover:underline">
            {value}
          </a>
        ) : (
          <span className="text-sm text-gray-900">{value || "-"}</span>
        )}
        {onEdit && (
          <button
            type="button"
            className="inline-flex p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label={`Edit ${label}`}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="grid grid-cols-3 gap-4 py-2">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 col-span-2">
        {Array.isArray(value) ? value.join(", ") : value ? String(value) : "-"}
      </dd>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-8">
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-semibold ring-2 ring-offset-2 ring-offset-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${derivedAvatarTheme.bgStart}, ${derivedAvatarTheme.bgEnd})`,
                boxShadow: `0 2px 8px ${derivedAvatarTheme.shadow}`,
                outline: `2px solid ${derivedAvatarTheme.outline}`,
                color: "#0b2540",
              }}
            >
              {initials || profile.email?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {profile.first_name || profile.last_name
                ? `${profile.first_name || ""} ${profile.last_name || ""}`
                : profile.email}
              {activeBoosts > 0 && (
                <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-50" />
              )}
            </h1>
            <div className="flex flex-col items-start gap-2 mt-1">
              {activeBoosts > 0 ? (
                <span className="text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1 rounded-full shadow-sm border border-amber-400/50 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Premium Agent
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {userRole || profile.role || "User"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="account">
              <User className="w-4 h-4 mr-2" />
              {t("account_title")}
            </TabsTrigger>
            <TabsTrigger value="profile">
              {userRole === "agent" ? (
                <Building className="w-4 h-4 mr-2" />
              ) : (
                <UserCheck className="w-4 h-4 mr-2" />
              )}
              {t("account_profile_tab")}
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              {t("account_security_tab")}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              {t("account_notifications_tab")}
            </TabsTrigger>
          </TabsList>

          {/* Account Details Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>{t("account_title")}</CardTitle>
                <CardDescription>{t("account_manage_profile")}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>{t("account_loading")}</p>
                ) : (
                  <div>
                    <InfoRow
                      label={t("account_edit_first_name")}
                      value={profile.first_name || metadataFirstName}
                      onEdit={() => setOpenFirst(true)}
                    />
                    <InfoRow
                      label={t("account_edit_last_name")}
                      value={profile.last_name || metadataLastName}
                      onEdit={() => setOpenLast(true)}
                    />
                    <InfoRow
                      label="Email"
                      value={profile.email || metadataEmail}
                      isLink
                      href={`mailto:${profile.email || metadataEmail}`}
                    />
                    <InfoRow
                      label={t("account_edit_phone")}
                      value={profile.phone || user?.phone}
                      onEdit={() => setOpenPhone(true)}
                    />
                    <InfoRow
                      label={t("account_role_label")}
                      value={userRole || profile.role}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Details Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("account_profile_info")}</CardTitle>
                <CardDescription>
                  {t("account_manage_role_info")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRole === "agent" ? (
                  agentLoading ? (
                    <p>{t("account_loading_agent")}</p>
                  ) : agent ? (
                    <div className="space-y-2">
                      <DetailRow
                        label={t("account_agent_company_name")}
                        value={agent.company_name}
                      />
                      <DetailRow
                        label={t("account_agent_license")}
                        value={agent.license_number}
                      />
                      <DetailRow
                        label={t("account_agent_address")}
                        value={agent.address}
                      />
                      <DetailRow
                        label={t("account_agent_property_types")}
                        value={agent.property_types}
                      />
                      <DetailRow
                        label={t("account_agent_service_areas")}
                        value={agent.service_areas}
                      />
                      <DetailRow
                        label={t("account_agent_status")}
                        value={agent.status}
                      />
                    </div>
                  ) : (
                    <p>{t("account_agent_not_found")}</p>
                  )
                ) : userRole === "customer" ? (
                  customerLoading ? (
                    <p>{t("account_loading_customer")}</p>
                  ) : customer ? (
                    <div className="space-y-2">
                      <DetailRow
                        label={t("account_customer_address")}
                        value={customer.address}
                      />
                      <DetailRow
                        label={t("account_customer_preferred_location")}
                        value={customer.preferred_location}
                      />
                      <DetailRow
                        label={t("account_customer_budget_range")}
                        value={customer.budget_range}
                      />
                      <DetailRow
                        label={t("account_customer_interested_types")}
                        value={customer.interested_property_types}
                      />
                    </div>
                  ) : (
                    <p>{t("account_customer_not_found")}</p>
                  )
                ) : (
                  <p>{t("account_no_profile_role")}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t("account_security_title")}</CardTitle>
                <CardDescription>{t("account_security_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t("account_password_label")}</Label>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500">
                      {t("account_password_hint")}
                    </p>
                    <Button variant="outline">
                      {t("account_change_password")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t("account_notifications_title")}</CardTitle>
                <CardDescription>
                  {t("account_notifications_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label
                      htmlFor="email-notifications"
                      className="font-medium"
                    >
                      {t("account_notifications_email")}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {t("account_notifications_email_desc")}
                    </p>
                  </div>
                  <Switch id="email-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label htmlFor="sms-notifications" className="font-medium">
                      {t("account_notifications_sms")}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {t("account_notifications_sms_desc")}
                    </p>
                  </div>
                  <Switch id="sms-notifications" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit dialogs */}
      {user?.id && (
        <>
          <EditFirstNameDialog
            open={openFirst}
            onOpenChange={setOpenFirst}
            userId={user.id}
            currentValue={profile.first_name || metadataFirstName}
            onUpdated={(v: string) =>
              setProfile(p => ({ ...p, first_name: v }))
            }
          />
          <EditLastNameDialog
            open={openLast}
            onOpenChange={setOpenLast}
            userId={user.id}
            currentValue={profile.last_name || metadataLastName}
            onUpdated={(v: string) => setProfile(p => ({ ...p, last_name: v }))}
          />
          <EditPhoneDialog
            open={openPhone}
            onOpenChange={setOpenPhone}
            userId={user.id}
            currentValue={profile.phone || user?.phone}
            onUpdated={(v: string) => setProfile(p => ({ ...p, phone: v }))}
          />
        </>
      )}
    </div>
  );
}
