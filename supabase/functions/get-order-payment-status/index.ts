import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentRecord = {
  id: number;
  order_id: number;
  provider: string | null;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
  vesicash_payment_id: string | null;
  vesicash_transaction_id: string | null;
} | null;

type OrderRecord = {
  id: number;
  order_number: string | null;
  status: string | null;
  payment_status: string | null;
  total_amount: number | null;
  created_at: string | null;
  billing_address: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  user_id: string | null;
  vendor_id: string | null;
  order_items: Array<{
    id: number;
    quantity: number;
    price_snapshot: number | null;
    products: {
      name: string;
      main_image: string | null;
    } | null;
  }> | null;
} | null;

function normaliseOrderStatus(status: string | null, paymentStatus: string | null) {
  const current = `${status ?? ""}`.toLowerCase();
  if (current === "completed") {
    return "delivered";
  }

  if (current === "pending" && ["pending", "authorised"].includes(`${paymentStatus ?? ""}`.toLowerCase())) {
    return "pending_payment";
  }

  return current || "pending_payment";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: profileByUserId, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role, email, full_name, phone, company_name, address")
      .eq("user_id", user.id)
      .maybeSingle();

    let profile = profileByUserId;

    if (profileError) {
      throw new Error(profileError.message || "User profile not found");
    }

    if (!profile) {
      const { data: profileById, error: profileByIdError } = await supabaseAdmin
        .from("user_profiles")
        .select("id, role, email, full_name, phone, company_name, address")
        .eq("id", user.id)
        .maybeSingle();

      if (profileByIdError) {
        throw new Error(profileByIdError.message || "User profile not found");
      }

      profile = profileById;
    }

    if (!profile) {
      throw new Error("User profile not found");
    }

    const requestBody = await req.json().catch(() => ({}));
    const orderId = Number(requestBody.orderId);
    const orderNumber = String(requestBody.orderNumber ?? "").trim();
    const reference = String(requestBody.reference ?? "").trim();

    let paymentRecord: PaymentRecord = null;
    let orderRecord: OrderRecord = null;

    if (reference) {
      const { data, error } = await supabaseAdmin
        .from("payments")
        .select("id, order_id, provider, status, created_at, completed_at, vesicash_payment_id, vesicash_transaction_id")
        .eq("vesicash_transaction_id", reference)
        .maybeSingle();

      if (error) {
        throw error;
      }

      paymentRecord = data;

      if (!paymentRecord) {
        const { data: byPaymentId, error: paymentIdError } = await supabaseAdmin
          .from("payments")
          .select("id, order_id, provider, status, created_at, completed_at, vesicash_payment_id, vesicash_transaction_id")
          .eq("vesicash_payment_id", reference)
          .maybeSingle();

        if (paymentIdError) {
          throw paymentIdError;
        }

        paymentRecord = byPaymentId;
      }
    }

    if (paymentRecord?.order_id) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          created_at,
          billing_address,
          shipping_address,
          user_id,
          vendor_id,
          order_items (
            id,
            quantity,
            price_snapshot,
            products (
              name,
              main_image
            )
          )
        `)
        .eq("id", paymentRecord.order_id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      orderRecord = data;
    } else if (!Number.isNaN(orderId) && orderId > 0) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          created_at,
          billing_address,
          shipping_address,
          user_id,
          vendor_id,
          order_items (
            id,
            quantity,
            price_snapshot,
            products (
              name,
              main_image
            )
          )
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      orderRecord = data;
    } else if (orderNumber) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          created_at,
          billing_address,
          shipping_address,
          user_id,
          vendor_id,
          order_items (
            id,
            quantity,
            price_snapshot,
            products (
              name,
              main_image
            )
          )
        `)
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (error) {
        throw error;
      }

      orderRecord = data;
    }

    if (!orderRecord) {
      return new Response(JSON.stringify({ order: null, payment: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const requesterRole = profile.role ?? "customer";
    const requesterIds = Array.from(new Set([profile.id, user.id].filter(Boolean))).map(String);
    const orderOwnerId = String(orderRecord.user_id ?? "").trim();
    const vendorOwnerId = String(orderRecord.vendor_id ?? "").trim();
    const isAdmin = ["admin", "super_admin"].includes(requesterRole);
    const isVendor = requesterRole === "vendor" && vendorOwnerId && requesterIds.includes(vendorOwnerId);
    const isOrderOwner = orderOwnerId && requesterIds.includes(orderOwnerId);
    const isReferenceLookup = Boolean(reference && paymentRecord);

    if (!isAdmin && !isVendor && !isOrderOwner && !isReferenceLookup) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (!paymentRecord) {
      const { data, error } = await supabaseAdmin
        .from("payments")
        .select("id, order_id, provider, status, created_at, completed_at, vesicash_payment_id, vesicash_transaction_id")
        .eq("order_id", orderRecord.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      paymentRecord = data;
    }

    const showAccountPrompt =
      requesterRole === "customer" &&
      (paymentRecord?.status === "paid" || orderRecord.payment_status === "paid");

    return new Response(
      JSON.stringify({
        order: {
          id: String(orderRecord.id),
          order_number: orderRecord.order_number,
          status: normaliseOrderStatus(orderRecord.status, orderRecord.payment_status),
          payment_status: orderRecord.payment_status,
          total_amount: Number(orderRecord.total_amount ?? 0),
          created_at: orderRecord.created_at,
          billing_address: orderRecord.billing_address,
          shipping_address: orderRecord.shipping_address,
          order_items: (orderRecord.order_items || []).map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unit_price: Number(item.price_snapshot ?? 0),
            products: item.products
              ? {
                  name: item.products.name,
                  main_image: item.products.main_image,
                }
              : null,
          })),
        },
        payment: paymentRecord
          ? {
              id: paymentRecord.id,
              provider: paymentRecord.provider,
              status: paymentRecord.status,
              created_at: paymentRecord.created_at,
              completed_at: paymentRecord.completed_at,
              reference: paymentRecord.vesicash_transaction_id,
              payment_id: paymentRecord.vesicash_payment_id,
            }
          : null,
        customer: {
          role: requesterRole,
          email: profile.email || orderRecord.billing_address?.email || orderRecord.shipping_address?.email || "",
          full_name: profile.full_name || orderRecord.billing_address?.full_name || "",
          phone: profile.phone || orderRecord.billing_address?.phone || orderRecord.shipping_address?.phone || "",
        },
        show_account_prompt: showAccountPrompt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
