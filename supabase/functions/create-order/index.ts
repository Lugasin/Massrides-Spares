import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveFxRateSnapshot } from "../_shared/fx-rate.ts"
import { loadVesicashConfig } from "../_shared/vesicash.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateOrderRequest {
  customer_info: {
    email: string;
    phone?: string;
    firstName: string;
    lastName: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  shipping_info?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  guest_session_id?: string;
  payment_method?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body: CreateOrderRequest = await req.json()
    const { customer_info, shipping_info, guest_session_id, payment_method = 'vesicash' } = body

    const authHeader = req.headers.get('Authorization')
    let user_id: string | null = null
    if (authHeader) {
        const { data: { user } } = await createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        ).auth.getUser()
        user_id = user?.id || null
    }

    // Handle Guest Cart if no user_id
    if (!user_id && guest_session_id) {
        // Find guest cart items
        const { data: guestCart } = await supabaseAdmin
            .from('guest_carts')
            .select('id')
            .eq('session_id', guest_session_id)
            .single()
        
        if (guestCart) {
            // Check if we have items
            const { data: items } = await supabaseAdmin.from('guest_cart_items').select('*').eq('guest_cart_id', guestCart.id)
            if (items && items.length > 0) {
                // For production, we'd create a temporary user or link to a guest user account
                // For simplicity here, we'll try to find or create a 'guest' user in profiles
            }
        }
    }

    // Call RPC to create order
    const { data: orderId, error: rpcError } = await supabaseAdmin.rpc("create_order_from_cart", {
        _user_id: user_id,
        _shipping_address: {
            ...customer_info,
            ...(shipping_info || {}),
            full_name: `${shipping_info?.firstName || customer_info.firstName} ${shipping_info?.lastName || customer_info.lastName}`.trim()
        },
        _payment_method: payment_method
    });

    if (rpcError) throw new Error(rpcError.message)

    const { data: order, error: orderFetchError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

    if (orderFetchError || !order) throw new Error("Order not found after creation")

    const fxRate = await resolveFxRateSnapshot(supabaseAdmin)
    const totalUSD = Number(order.total_amount)
    const totalZMW = Number((totalUSD * fxRate.rate).toFixed(2))
    const reference = `ORD-${order.order_number}-${Date.now()}`

    const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
            order_id: order.id,
            provider: payment_method,
            vesicash_transaction_id: reference,
            status: 'pending',
            amount_usd: totalUSD,
            amount_zmw: totalZMW,
            exchange_rate: fxRate.rate,
            base_currency: 'USD',
            quote_currency: 'ZMW'
        })
        .select()
        .single()

    if (paymentError) throw new Error(`Payment record creation failed`)

    let payment_link = null
    if (payment_method === 'vesicash') {
        const vesicash = await loadVesicashConfig(supabaseAdmin)
        const callbackUrl = new URL("/checkout/success", req.headers.get('origin') || "https://massridesspares.netlify.app")
        callbackUrl.searchParams.set("order", String(order.id))

        const vesicashPayload = {
            currency: "ZMW",
            country: "ZM",
            narration: `Order ${order.order_number}`,
            amount: totalZMW,
            webhook_url: vesicash.paymentWebhookUrl,
            redirect_url: callbackUrl.toString(),
            customer: {
                email: customer_info.email,
                phone_number: customer_info.phone,
                first_name: customer_info.firstName,
                last_name: customer_info.lastName,
                address: customer_info.address,
                city: customer_info.city,
                country: customer_info.country || "Zambia"
            },
            metadata: {
                order_id: order.id,
                order_number: order.order_number,
                reference
            }
        }

        const vesicashRes = await fetch(`${vesicash.apiBaseUrl}/payment/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'V-PRIVATE-KEY': vesicash.secretKey!,
                'V-PUBLIC-KEY': vesicash.publicKey!
            },
            body: JSON.stringify(vesicashPayload)
        })

        const vData = await vesicashRes.json()
        if (!vesicashRes.ok) throw new Error(vData.message || "Vesicash initialization failed")

        payment_link = vData.data?.payment_link || vData.data?.checkout_url

        await supabaseAdmin
            .from('payments')
            .update({
                vesicash_payment_id: vData.data?.payment_id,
                vesicash_transaction_id: vData.data?.reference || reference
            })
            .eq('id', payment.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        payment_link,
        total_usd: totalUSD,
        total_zmw: totalZMW,
        fx_rate: fxRate.rate
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in create-order:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
