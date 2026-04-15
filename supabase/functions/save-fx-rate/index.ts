import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FxRatePayload = {
  base_currency: string;
  quote_currency: string;
  provider: string;
  rate: number;
  rate_date: string | null;
  fetched_at: string;
  expires_at: string | null;
  source_payload: Record<string, unknown> | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const role = String(profile?.role ?? "").toLowerCase();
    if (!["admin", "super_admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json().catch(() => ({}))) as FxRatePayload;
    const baseCurrency = String(payload.base_currency ?? "USD").trim().toUpperCase();
    const quoteCurrency = String(payload.quote_currency ?? "ZMW").trim().toUpperCase();
    const rate = Number(payload.rate);

    if (!baseCurrency || !quoteCurrency || !Number.isFinite(rate) || rate <= 0) {
      return new Response(JSON.stringify({ error: "INVALID_RATE", message: "Invalid exchange rate payload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertError } = await supabaseAdmin
      .from("fx_rates")
      .upsert(
        {
          base_currency: baseCurrency,
          quote_currency: quoteCurrency,
          provider: String(payload.provider ?? "manual_admin").trim(),
          rate,
          rate_date: payload.rate_date,
          fetched_at: payload.fetched_at,
          expires_at: payload.expires_at,
          source_payload: payload.source_payload ?? null,
        },
        { onConflict: "base_currency,quote_currency" },
      );

    if (upsertError) {
      throw upsertError;
    }

    return new Response(JSON.stringify({ success: true, rate, base_currency: baseCurrency, quote_currency: quoteCurrency }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("save-fx-rate error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
