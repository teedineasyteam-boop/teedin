import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, propertyData, propertyDetails } = body;

    if (!agentId || !propertyData || !propertyDetails) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate agent exists
    const { data: agent, error: agentError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", agentId)
      .eq("role", "agent")
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }

    // Start transaction by creating property first
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .insert({
        agent_id: agentId,
        listing_type: propertyData.listing_type,
        property_category: propertyData.property_category,
        in_project: propertyData.in_project || false,
        rental_duration: propertyData.rental_duration,
        location: propertyData.location || {},
      })
      .select()
      .single();

    if (propertyError) {
      console.error("Error creating property:", propertyError);
      return NextResponse.json(
        { error: "Failed to create property: " + propertyError.message },
        { status: 500 }
      );
    }

    // Create property details
    const { data: details, error: detailsError } = await supabase
      .from("property_details")
      .insert({
        property_id: property.id,
        project_name: propertyDetails.project_name,
        address: propertyDetails.address,
        usable_area: propertyDetails.usable_area,
        bedrooms: propertyDetails.bedrooms,
        bathrooms: propertyDetails.bathrooms,
        parking_spaces: propertyDetails.parking_spaces,
        house_condition: propertyDetails.house_condition,
        highlight: propertyDetails.highlight,
        area_around: propertyDetails.area_around,
        facilities: propertyDetails.facilities || [],
        project_facilities: propertyDetails.project_facilities || [],
        description: propertyDetails.description,
        price: propertyDetails.price,
        images: propertyDetails.images || [],
        latitude: propertyDetails.latitude,
        longitude: propertyDetails.longitude,
        view_count: 0,
      })
      .select()
      .single();

    if (detailsError) {
      console.error("Error creating property details:", detailsError);

      // Rollback - delete the property
      await supabase.from("properties").delete().eq("id", property.id);

      return NextResponse.json(
        { error: "Failed to create property details: " + detailsError.message },
        { status: 500 }
      );
    } // Return the created property with details in the new format
    const responseData = {
      id: property.id,
      listing_type: property.listing_type || [],
      property_category: property.property_category || "ไม่ระบุ",
      project_name: details.project_name || "ไม่ระบุชื่อโครงการ",
      address: details.address || "ไม่ระบุที่อยู่",
      usable_area: details.usable_area || 0,
      bedrooms: details.bedrooms || 0,
      bathrooms: details.bathrooms || 0,
      parking_spaces: details.parking_spaces || 0,
      price: details.price || 0,
      house_condition: details.house_condition || "",
      highlight: details.highlight || "",
      description: details.description || "",
      images: Array.isArray(details.images)
        ? details.images
        : details.images
          ? [details.images]
          : [],
      created_at: property.created_at,
      agent_id: property.agent_id,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Property created successfully",
    });
  } catch (error) {
    console.error("Error in create-listing API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
