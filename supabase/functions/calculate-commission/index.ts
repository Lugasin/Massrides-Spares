import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { order_id } = await req.json()

    if (!order_id) {
        throw new Error('order_id is required');
    }

    // 1. Get order with vendor info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        vendor_id,
        user_id,
        items:order_items(product:products(category_id))
      `) // Assuming order_items relationship
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
        throw new Error('Order not found or fetch failed: ' + (orderError?.message || 'Unknown'));
    }
    
    // 2. Ensure order has user_id (not guest)
    if (!order.user_id) {
      throw new Error('Order must be linked to authenticated user before commission calculation');
    }

    // 3. Get applicable commission config
    // Strategy: Check Vendor Specific loop -> Category loop -> Platform default
    let config = null;

    // Check Vendor Config
    const { data: vendorConfig } = await supabase
        .from('commission_configs')
        .select('*')
        .eq('entity_type', 'vendor')
        .eq('entity_id', order.vendor_id)
        .eq('active', true)
        .single();
    
    if (vendorConfig) {
        config = vendorConfig;
    } else {
        // Check Category Config (Use first product's category for now ?)
        // In complex marketplaces, commission might be per-item. For MVP, we stick to Order Level based on first item logic or similar.
        // Let's assume order level based on main category.
        const categoryId = order.items?.[0]?.product?.category_id;
        if (categoryId) {
             const { data: catConfig } = await supabase
                .from('commission_configs')
                .select('*')
                .eq('entity_type', 'category')
                .eq('entity_id', categoryId)
                .eq('active', true)
                .single();
            if (catConfig) config = catConfig;
        }
    }

    // Fallback to Platform Default
    if (!config) {
        const { data: platformConfig } = await supabase
            .from('commission_configs')
            .select('*')
            .eq('entity_type', 'platform')
            .eq('active', true)
            .single();
        config = platformConfig;
    }

    if (!config) throw new Error('No commission configuration found (ensure platform default exists)');

    // 4. Calculate amounts
    let commissionAmount = 0;
    if (config.is_percentage) {
        commissionAmount = Number(order.total) * (Number(config.rate) / 100);
    } else {
        commissionAmount = Number(config.fixed_amount);
    }
    
    // Round to 2 decimals
    commissionAmount = Math.round(commissionAmount * 100) / 100;

    const vendorAmount = Number(order.total) - commissionAmount;

    // 5. Upsert commission record (idempotent)
    const { data: commission, error: upsertError } = await supabase
      .from('platform_commissions')
      .upsert({
        order_id: order_id,
        vendor_id: order.vendor_id,
        commission_config_id: config.id,
        base_amount: order.total,
        commission_rate: config.rate,
        commission_amount: commissionAmount,
        status: 'pending'
      }, { onConflict: 'order_id' })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // 6. Audit log
    await supabase.from('financial_audit_logs').insert({
      event_type: 'commission_calculated',
      entity_type: 'order',
      entity_id: order_id,
      amount: commissionAmount,
      metadata: { vendor_amount: vendorAmount, config_id: config.id },
      // actor_id: ... // automated system
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
            commissionAmount, 
            vendorAmount, 
            platformAmount: commissionAmount,
            configApplied: config.entity_type 
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in calculate-commission:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
