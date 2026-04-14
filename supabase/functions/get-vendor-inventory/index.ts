import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message || "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const { data: profileByUserId, error: profileByUserIdError } = await supabase
      .from("user_profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileByUserIdError) {
      throw profileByUserIdError;
    }

    const vendorProfile = profileByUserId ?? await (async () => {
      const { data: profileById, error: profileByIdError } = await supabase
        .from("user_profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileByIdError) {
        throw profileByIdError;
      }

      return profileById;
    })();

    if (!vendorProfile) {
      return new Response(
        JSON.stringify({ error: "Vendor profile not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    if (!["vendor", "admin", "super_admin"].includes(vendorProfile.role || "")) {
      return new Response(
        JSON.stringify({ error: "Vendor access required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    const vendorIds = Array.from(new Set([vendorProfile.id, user.id].filter(Boolean))) as string[];

    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        sku,
        name,
        description,
        price,
        category_id,
        is_active,
        main_image,
        created_at,
        stock_quantity,
        attributes,
        vendor_id,
        category:categories(name),
        inventory(quantity, threshold, location, last_restocked)
      `)
      .in("vendor_id", vendorIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const inventory = (products || []).map((product: any) => {
      const attrs = typeof product.attributes === "object" && product.attributes ? product.attributes : {};
      const inventoryRow = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
      const stockQuantity = Number(inventoryRow?.quantity ?? product.stock_quantity ?? 0);
      const threshold = Number(inventoryRow?.threshold ?? attrs.min_stock_level ?? 5);

      return {
        id: String(product.id),
        part_number: product.sku || "",
        name: product.name,
        description: product.description || "",
        price: Number(product.price || 0),
        brand: String(attrs.brand || ""),
        condition: String(attrs.condition || "new"),
        availability_status: String(attrs.availability_status || (stockQuantity > 0 ? "in_stock" : "out_of_stock")),
        stock_quantity: stockQuantity,
        min_stock_level: threshold,
        featured: attrs.featured === true,
        category: { name: product.category?.name || "Uncategorized" },
        created_at: product.created_at,
        is_active: product.is_active ?? true,
        main_image: product.main_image,
      };
    });

    return new Response(
      JSON.stringify({ inventory }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
