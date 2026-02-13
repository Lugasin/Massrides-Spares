import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: vendors, error: vendorError } = await supabase
    .from("vendors")
    .select("id");

  if (vendorError || !vendors) {
    console.error("Failed to fetch vendors:", vendorError);
    return new Response("Failed to fetch vendors", { status: 500 });
  }

  for (const vendor of vendors) {
    const { data: balance, error: balanceError } = await supabase
      .rpc("get_vendor_available_balance", { v_id: vendor.id });

    if (balanceError) {
      console.error(`Failed to get balance for vendor ${vendor.id}:`, balanceError);
      continue;
    }

    if (balance > 100) { // threshold
      const { data: payoutId, error: payoutError } = await supabase
        .rpc("create_payout_batch", { v_id: vendor.id });

      if (payoutError) {
        console.error(`Failed to create payout batch for vendor ${vendor.id}:`, payoutError);
        continue;
      }

      await supabase.from("notifications").insert({
        target_role: "super_admin", // Updated to match schema
        title: "Payout Batch Created",
        message: `Payout batch created for vendor ${vendor.id}. Amount: ${balance}`,
        type: "info"
      });
    }
  }

  return new Response("Payout cron completed");
});
