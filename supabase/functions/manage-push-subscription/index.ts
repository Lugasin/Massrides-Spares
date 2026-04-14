import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type PushSubscriptionPayload = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header." }, 401);
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      },
    );

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: authError?.message ?? "Unauthorized" }, 401);
    }

    const body = await req.json();
    const action = String(body?.action ?? "upsert").toLowerCase();

    if (action === "remove") {
      const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
      let query = supabaseAdmin.from("push_subscriptions").delete().eq("user_id", user.id);

      if (endpoint) {
        query = query.eq("endpoint", endpoint);
      }

      const { error } = await query;
      if (error) {
        throw error;
      }

      return jsonResponse({ success: true, action: "remove" });
    }

    const subscription = (body?.subscription ?? {}) as PushSubscriptionPayload;
    const endpoint = subscription.endpoint?.trim() ?? "";
    const p256dh = subscription.keys?.p256dh?.trim() ?? "";
    const auth = subscription.keys?.auth?.trim() ?? "";

    if (!endpoint || !p256dh || !auth) {
      return jsonResponse({ error: "A valid push subscription payload is required." }, 400);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh_key: p256dh,
          auth_key: auth,
          expiration_time: subscription.expirationTime ?? null,
          user_agent: req.headers.get("user-agent"),
          updated_at: now,
          last_used_at: now,
        },
        { onConflict: "endpoint" },
      )
      .select("id, endpoint, user_id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return jsonResponse({
      success: true,
      action: "upsert",
      subscription: data,
    });
  } catch (error) {
    console.error("manage-push-subscription error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      400,
    );
  }
});
