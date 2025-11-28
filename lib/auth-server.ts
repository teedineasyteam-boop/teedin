import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const getUserFromRequest = async (request: NextRequest) => {
  try {
    // Parse cookies from request
    const cookieHeader = request.headers.get("cookie") || "";

    // Debug: Log cookie header (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log("Cookie header:", cookieHeader.substring(0, 200));
    }

    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (name && rest.length > 0) {
          acc[name] = decodeURIComponent(rest.join("="));
        }
        return acc;
      },
      {} as Record<string, string>
    );

    // Debug: Log cookie names (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log("Cookie names:", Object.keys(cookies));
    }

    // Check Authorization header first (priority)
    const authHeader = request.headers.get("authorization");
    let accessToken: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.replace("Bearer ", "").trim();
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Found access token in Authorization header");
      }
    }

    // Fallback: Try to get access token from cookies
    if (!accessToken) {
      for (const [name, value] of Object.entries(cookies)) {
        if (
          name === "sb-access-token" ||
          name.includes("access-token") ||
          name.includes("-auth-token")
        ) {
          accessToken = value;
          if (process.env.NODE_ENV === "development") {
            console.log("✅ Found access token in cookies:", name);
          }
          break;
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Access token status:", {
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        hasAuthHeader: !!authHeader,
      });
    }

    // Create Supabase client with SSR support
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value: value || "",
          }));
        },
        setAll: () => {
          // No-op for route handlers
        },
      },
    });

    // Try to get user from session using SSR client
    let user = null;
    let error = null;

    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
      error = result.error;
    } catch (e) {
      error = e instanceof Error ? e : new Error("Failed to get user");
    }

    // If SSR method fails and we have access token, try direct method
    if ((error || !user) && accessToken) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "⚠️ SSR method failed, trying direct method with access token"
        );
      }

      const { createClient } = await import("@supabase/supabase-js");
      const fallbackClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      let result = await fallbackClient.auth.getUser(accessToken);

      // If getUser(token) fails with "Auth session missing!", try setting session manually
      if (result.error && result.error.message === "Auth session missing!") {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "⚠️ 'Auth session missing!' error, attempting to set session manually..."
          );
        }
        // Try setting session with just access token (refresh token is optional/dummy)
        const { error: setSessionError } = await fallbackClient.auth.setSession(
          {
            access_token: accessToken,
            refresh_token: "",
          }
        );

        if (!setSessionError) {
          // Now try getUser() without args, which uses the session we just set
          result = await fallbackClient.auth.getUser();
        } else {
          if (process.env.NODE_ENV === "development") {
            console.error("❌ setSession failed:", setSessionError.message);
          }
        }
      }

      user = result.data.user;
      error = result.error;

      if (process.env.NODE_ENV === "development") {
        if (user) {
          console.log("✅ Direct method succeeded, user ID:", user.id);
        } else {
          console.error("❌ Direct method failed:", error?.message);
        }
      }
    }

    if (error || !user) {
      if (process.env.NODE_ENV === "development") {
        console.error("getUserFromRequest: Authentication failed", {
          error: error?.message,
          hasAccessToken: !!accessToken,
          cookieCount: Object.keys(cookies).length,
        });
      }
      return {
        token: null,
        user: null,
        error: error || new Error("User not authenticated"),
      };
    }

    return {
      token: accessToken,
      user,
      error: null,
    };
  } catch (error) {
    console.error("getUserFromRequest error:", error);
    return {
      token: null,
      user: null,
      error:
        error instanceof Error ? error : new Error("Authentication failed"),
    };
  }
};
