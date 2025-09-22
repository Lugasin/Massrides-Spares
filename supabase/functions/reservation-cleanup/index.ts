
// reservation-cleanup/index.ts
// Supabase Edge Function (Deno TypeScript)
// ENV required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { fetch });

serve(async (req) => {
  try {
    const { data: staleOrders } = await supabase.from('orders').select('*').in('status', ['pending','initiated']).lt('expires_at', new Date().toISOString()).limit(100);
    for (const order of staleOrders || []) {
      await supabase.rpc('release_inventory_for_order', { o_id: order.id });
      await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id);
      if (order.user_id) {
        await supabase.from('notifications').insert([{ user_id: order.user_id, type: 'order_cancelled', title: 'Order cancelled', message: `Your order ${order.order_reference} was cancelled due to inactive payment.`, created_at: new Date().toISOString() }]);
      }
    }
    return new Response(JSON.stringify({ cancelled: (staleOrders || []).length }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("reservation-cleanup error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
