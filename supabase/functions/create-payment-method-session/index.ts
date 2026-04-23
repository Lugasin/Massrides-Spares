import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getVesicashApiHeaders, loadVesicashConfig } from "../_shared/vesicash.ts";

console.log("Create-Payment-Method-Session Function Invoked");

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
      throw new Error("Missing authorization header");
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();

    if (userError || !user) {
      throw new Error(userError?.message || "Unauthorized");
    }

    const { data: profileByUserId, error: profileByUserIdError } = await supabase
      .from("user_profiles")
      .select("id, user_id, email, full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileByUserIdError) {
      throw profileByUserIdError;
    }

    const profile = profileByUserId ?? await (async () => {
      const { data: profileById, error: profileByIdError } = await supabase
        .from("user_profiles")
        .select("id, user_id, email, full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profileByIdError) {
        throw profileByIdError;
      }

      return profileById;
    })();

    if (!profile) {
      throw new Error("User profile not found");
    }

    const requestBody = await req.json().catch(() => ({}));
    const returnUrl = String(requestBody.return_url ?? "").trim();
    const cancelUrl = String(requestBody.cancel_url ?? "").trim();
    const currency = String(requestBody.currency ?? "USD").trim() || "USD";
    const tokenizationAmount = Number(Deno.env.get("VESICASH_TOKENIZATION_AMOUNT") ?? "0");

    const vesicash = await loadVesicashConfig(supabase);
    const reference = `PMT-${profile.id}-${Date.now()}`;

    const defaultBaseUrl = Deno.env.get("APP_BASE_URL") ?? "http://localhost:5173";
    const successUrl = returnUrl || `${defaultBaseUrl}/payment-methods?status=success`;
    const failureUrl = cancelUrl || `${defaultBaseUrl}/payment-methods?status=cancelled`;

    let paymentUrl = "";
    let rawResponse: Record<string, any> = {};

    if (vesicash.secretKey) {
      const payload = {
        amount: tokenizationAmount,
        currency,
        reference,
        redirect_url: successUrl,
        return_url: successUrl,
        cancel_url: failureUrl,
        email: profile.email || user.email || "guest@massrides.co.zm",
        description: "Save payment method",
        purpose: "tokenize",
        metadata: {
          purpose: "tokenize",
          user_id: profile.id,
          auth_user_id: user.id,
        },
      };

      const response = await fetch(`${vesicash.apiBaseUrl}/transactions/create`, {
        method: "POST",
        headers: getVesicashApiHeaders(vesicash),
        body: JSON.stringify(payload),
      });

      rawResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(rawResponse?.message || rawResponse?.error || "Failed to create payment method session");
      }

      paymentUrl = rawResponse.data?.link || rawResponse.data?.payment_url || rawResponse.data?.checkout_url || rawResponse.data?.url || "";
      if (!paymentUrl) {
        throw new Error("Vesicash did not return a payment URL.");
      }
    } else {
      console.warn("Using MOCK payment-method session (no Vesicash secret key)");
      paymentUrl = `${successUrl}${successUrl.includes("?") ? "&" : "?"}reference=${encodeURIComponent(reference)}&status=success`;
      rawResponse = { mock: true, reference };
    }

    return new Response(
      JSON.stringify({
        payment_url: paymentUrl,
        checkout_url: paymentUrl,
        reference,
        success_url: successUrl,
        cancel_url: failureUrl,
        mock: !vesicash.secretKey,
        raw_response: rawResponse,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error creating payment method session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create payment method session" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
