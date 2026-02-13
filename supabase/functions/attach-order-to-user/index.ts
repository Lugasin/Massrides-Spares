import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Attach Order to User
 * 
 * Called after a guest creates an account post-payment.
 * Links past orders by guest_email/guest_phone to the new user_id.
 */

console.log("Attach-Order-To-User Function Started");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ==========================================
    // 1. Authenticate User
    // ==========================================
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Invalid or expired token");
    }

    console.log(`Attaching orders to user: ${user.id} (${user.email})`);

    // ==========================================
    // 2. Get User Email/Phone
    // ==========================================
    
    const userEmail = user.email;
    const userPhone = user.phone;

    if (!userEmail && !userPhone) {
      throw new Error("User must have email or phone to link orders");
    }

    // ==========================================
    // 3. Find Guest Orders
    // ==========================================
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build query for matching orders
    let query = supabaseAdmin
      .from('orders')
      .select('id, guest_email, guest_phone, status, total_amount')
      .is('user_id', null);  // Only orders without a user

    if (userEmail && userPhone) {
      query = query.or(`guest_email.eq.${userEmail},guest_phone.eq.${userPhone}`);
    } else if (userEmail) {
      query = query.eq('guest_email', userEmail);
    } else if (userPhone) {
      query = query.eq('guest_phone', userPhone);
    }

    const { data: guestOrders, error: findError } = await query;

    if (findError) {
      console.error("Error finding guest orders:", findError);
      throw new Error(`Failed to find guest orders: ${findError.message}`);
    }

    if (!guestOrders || guestOrders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No guest orders found to attach",
          orders_attached: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${guestOrders.length} guest orders to attach`);

    // ==========================================
    // 4. Attach Orders to User
    // ==========================================
    
    const orderIds = guestOrders.map(o => o.id);

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        user_id: user.id,
        // Clear guest fields since user is now linked
        guest_email: null,
        guest_phone: null
      })
      .in('id', orderIds);

    if (updateError) {
      console.error("Error attaching orders:", updateError);
      throw new Error(`Failed to attach orders: ${updateError.message}`);
    }

    console.log(`Successfully attached ${orderIds.length} orders to user ${user.id}`);

    // ==========================================
    // 5. Create User Profile if Missing
    // ==========================================
    
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      await supabaseAdmin.from('profiles').insert({
        id: user.id,
        email: user.email,
        role: 'customer',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name
      });
      console.log("Created profile for new user");
    }

    // ==========================================
    // 6. Send Notification
    // ==========================================
    
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      title: 'Orders Linked',
      message: `We found ${guestOrders.length} previous order(s) and linked them to your account.`,
      type: 'success'
    });

    // ==========================================
    // 7. Log Activity
    // ==========================================
    
    await supabaseAdmin.from('activity_logs').insert({
      user_id: user.id,
      action: 'GUEST_ORDERS_ATTACHED',
      metadata: {
        order_ids: orderIds,
        count: orderIds.length,
        email: userEmail,
        phone: userPhone
      }
    });

    // ==========================================
    // Return Success
    // ==========================================
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Attached ${guestOrders.length} order(s) to your account`,
        orders_attached: guestOrders.length,
        orders: guestOrders.map(o => ({
          id: o.id,
          status: o.status,
          total_amount: o.total_amount
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
