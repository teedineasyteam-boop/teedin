import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// สร้าง Supabase client สำหรับ server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // Default เป็น month
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString()
    );

    console.log(
      "📊 Fetching properties trend data for period:",
      period,
      "year:",
      year
    );

    // ดึงข้อมูล properties เฉพาะปีที่ขอ เพื่อลดโหลด
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const { data: propertiesData, error: propertiesError } = await supabase
      .from("properties")
      .select("id, created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    if (propertiesError) {
      console.error("❌ Properties query error:", propertiesError);
      throw propertiesError;
    }

    console.log("📊 Total properties found:", propertiesData?.length || 0);

    const filteredProperties = propertiesData || [];

    console.log(
      "📊 Filtered properties for year",
      year,
      ":",
      filteredProperties.length
    );

    // จัดกลุ่มข้อมูลตามเดือน
    const groupedData: { [key: string]: number } = {};

    filteredProperties.forEach(property => {
      const createdAt = new Date(property.created_at);
      // สร้าง key ในรูปแบบ YYYY-MM-01 สำหรับแต่ละเดือน
      const monthKey = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-01`;

      groupedData[monthKey] = (groupedData[monthKey] || 0) + 1;
    });

    // สร้างข้อมูลสำหรับ chart - 12 เดือนของปีที่เลือก
    const chartData = [];
    for (let month = 0; month < 12; month++) {
      const monthKey = `${year}-${(month + 1).toString().padStart(2, "0")}-01`;
      chartData.push({
        date: monthKey,
        count: groupedData[monthKey] || 0,
      });
    }

    // เรียงลำดับข้อมูลตามวันที่
    chartData.sort((a, b) => a.date.localeCompare(b.date));

    console.log("✅ Monthly chart data generated:", {
      year,
      dataPoints: chartData.length,
      totalCount: chartData.reduce((sum, item) => sum + item.count, 0),
      monthlyData: chartData.map(item => ({
        month: item.date.split("-")[1],
        count: item.count,
      })),
    });

    return NextResponse.json(chartData, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch (error) {
    console.error("Properties trend API error:", error);

    // แทนที่จะส่ง fallback data ให้ส่ง error response แทน
    return NextResponse.json(
      {
        error: "Failed to fetch data from database",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
