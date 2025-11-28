import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ใช้ service role key เพื่ออัปเดต role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("🔄 API: Updating user role to agent for user:", userId);

    // อัปเดต role เป็น agent
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        role: "agent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, email, role, updated_at");

    if (updateError) {
      console.error("❌ API: Role update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update role", details: updateError.message },
        { status: 500 }
      );
    }

    if (
      !updatedUser ||
      !Array.isArray(updatedUser) ||
      updatedUser.length === 0
    ) {
      console.error("❌ API: No user found or updated");
      return NextResponse.json(
        { error: "User not found or not updated" },
        { status: 404 }
      );
    }

    const user = updatedUser[0];
    console.log("✅ API: Role updated successfully:", user);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("❌ API: Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
