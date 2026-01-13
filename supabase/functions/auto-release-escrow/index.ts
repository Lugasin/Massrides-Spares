import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This function is intended to be triggered by Supabase Cron
  // but can also be manually invoked
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Find eligible orders
    // Status = delivered
    // Updated At < 72 hours ago
    // Not in escrow_releases
    
    const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    // Get delivered orders
    const { data: eligibleOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'delivered')
        .lt('updated_at', cutoffTime);

    if (fetchError) throw fetchError;
    if (!eligibleOrders || eligibleOrders.length === 0) {
        return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check availability in escrow_releases
    // Use stored procedure or manual filter if list small. 
    // Ideally use NOT EXISTS in query, but Supabase JS doesn't support complex NOT EXISTS easily without join.
    // We can fetch existing releases for these IDs.
    
    const orderIds = eligibleOrders.map(o => o.id);
    const { data: existingReleases } = await supabase
        .from('escrow_releases')
        .select('order_id')
        .in('order_id', orderIds);
    
    const releasedIds = new Set(existingReleases?.map(r => r.order_id));
    const toRelease = eligibleOrders.filter(o => !releasedIds.has(o.id));

    console.log(`Auto-Release: Found ${toRelease.length} orders to release.`);

    const results = {
        success: 0,
        failed: 0,
        errors: [] as any[]
    };

    // 2. Process Releases
    for (const order of toRelease) {
        try {
            // Call release-escrow
            const { error } = await supabase.functions.invoke('release-escrow', {
                body: { order_id: order.id, trigger: 'auto_release' }
            });
            
            if (error) throw error;
            results.success++;
        } catch (err) {
            console.error(`Failed to auto-release order ${order.id}:`, err);
            results.failed++;
            results.errors.push({ order_id: order.id, error: err.message });
        }
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in auto-release-escrow:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
