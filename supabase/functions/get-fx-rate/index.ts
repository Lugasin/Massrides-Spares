import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { resolveFxRateSnapshot } from "../_shared/fx-rate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function getBodyOrQuery(req: Request) {
  const url = new URL(req.url);
  return {
    base_currency: url.searchParams.get("base_currency") ?? url.searchParams.get("base") ?? undefined,
    quote_currency: url.searchParams.get("quote_currency") ?? url.searchParams.get("quote") ?? undefined,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (!["GET", "POST"].includes(req.method)) {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};
    const query = getBodyOrQuery(req);
    const baseCurrency = String(body.base_currency ?? body.baseCurrency ?? query.base_currency ?? "USD");
    const quoteCurrency = String(body.quote_currency ?? body.quoteCurrency ?? query.quote_currency ?? "ZMW");

    // Special case: if base and quote are the same, return 1:1
    if (baseCurrency.toUpperCase() === quoteCurrency.toUpperCase()) {
        return new Response(JSON.stringify({
            fx_rate: {
                base_currency: baseCurrency,
                quote_currency: quoteCurrency,
                rate: 1,
                provider: "identity",
                source: "manual",
                fetched_at: new Date().toISOString()
            },
            source: "manual",
            fallback_used: false,
            stale_cache_used: false,
            note: "1:1 rate for identical currencies"
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const fx_rate = await resolveFxRateSnapshot(supabaseAdmin, {
      baseCurrency,
      quoteCurrency,
    });

    const response = {
      fx_rate,
      source: fx_rate.source,
      fallback_used: fx_rate.fallback_used,
      stale_cache_used: fx_rate.stale_cache_used,
      note: fx_rate.source === "manual"
        ? "Using manual exchange rate set by administrator."
        : "Exchange rate is based on live market data.",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "FX_RATE_UNAVAILABLE",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
