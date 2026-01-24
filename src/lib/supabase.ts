import { supabase } from '@/integrations/supabase/client'
import { v4 as uuidv4 } from 'uuid'

// Import types from the database
import type { Database } from '@/integrations/supabase/types';

export interface Category {
  id: string
  name: string
  description?: string
  image_url?: string
  created_at: string
}

export interface CartItem {
  id: string
  spare_part_id: string
  quantity: number
  spare_part?: any // Will be properly typed after DB is set up
}

export interface Order {
  id: string
  user_id?: string
  order_number: string
  status: string
  payment_status: string
  total_amount: number
  shipping_address?: any
  billing_address?: any
  notes?: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  company_name?: string
  role: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
  website_url?: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

// Session management for guest carts
export const getOrCreateSessionId = (): string => {
  let sessionId = localStorage.getItem('guest_session_id')
  if (!sessionId) {
    sessionId = uuidv4()
    localStorage.setItem('guest_session_id', sessionId)
  }
  return sessionId
}

// Cart management
export const addToCart = async (sparePartId: string, quantity: number = 1) => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User Cart: Upsert into cart_items (PK: user_id, product_id)
    // Check for existence to determine update (increment) or insert
    const { data: existing } = await (supabase as any)
      .from('cart_items')
      .select('row_id:id, quantity') // Use alias if needed, or just select 'id' if PK is composite but we have a surrogate
      // Wait, schema has composite PK (user_id, product_id). No surrogate 'id' in new schema?
      // Check create table cart_items: PRIMARY KEY (user_id, product_id)
      // So no 'id' column exists. We cannot select 'id'.
      .eq('user_id', user.id)
      .eq('product_id', sparePartId)
      .maybeSingle();

    if (existing) {
       return await (supabase as any)
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('user_id', user.id)
        .eq('product_id', sparePartId);
    } else {
       return await (supabase as any)
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: sparePartId,
          quantity
        });
    }

  } else {
    // Guest Cart: Flattened (PK: guest_session_id, product_id)
    const sessionId = getOrCreateSessionId();

    const { data: existing } = await (supabase as any)
      .from('guest_cart_items')
      .select('quantity')
      .eq('guest_session_id', sessionId)
      .eq('product_id', sparePartId)
      .maybeSingle();

    if (existing) {
      return await (supabase as any)
        .from('guest_cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('guest_session_id', sessionId)
        .eq('product_id', sparePartId);
    } else {
      return await (supabase as any)
        .from('guest_cart_items')
        .insert({
          guest_session_id: sessionId,
          product_id: sparePartId,
          quantity
        });
    }
  }
}

export const getCartItems = async (): Promise<CartItem[]> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User Cart Items
    const { data: items, error } = await (supabase as any)
      .from('cart_items')
      .select(`
        quantity,
        product_id, 
        product:products(
          id,
          name,
          price,
          sku,
          attributes,
          main_image,
          description
        )
      `)
      .eq('user_id', user.id);

    if (error) console.error("Error fetching cart", error);

    return items?.map((item: any) => {
       const p = item.product || {};
       const attrs = p.attributes || {};
       return {
          id: String(item.product_id), // Use Product ID as Cart Item ID (Composite Key Part)
          spare_part_id: String(item.product_id),
          quantity: item.quantity,
          spare_part: {
              id: String(p.id),
              name: p.name, // Schema uses 'name'
              price: p.price,
              part_number: p.sku,
              brand: attrs.brand || 'Generic',
              images: p.main_image ? [p.main_image] : [],
              description: p.description,
              condition: attrs.condition || 'new',
              warranty: attrs.warranty || '12 months'
          }
       };
    }) || [];
  } else {
    // Guest Cart Items
    const sessionId = getOrCreateSessionId()

    const { data: items, error } = await (supabase as any)
      .from('guest_cart_items')
      .select(`
        quantity,
        product_id,
        product:products(
          id,
          name,
          price,
          sku,
          attributes,
          main_image,
          description
        )
      `)
      .eq('guest_session_id', sessionId)

    if (error) console.error("Error fetching guest cart", error);

    return items?.map((item: any) => {
       const p = item.product || {};
       const attrs = p.attributes || {};
       return {
          id: String(item.product_id), // Use Product ID as Cart Item ID
          spare_part_id: String(item.product_id),
          quantity: item.quantity,
          spare_part: {
              id: String(p.id),
              name: p.name, 
              price: p.price,
              part_number: p.sku,
              brand: attrs.brand || 'Generic',
              images: p.main_image ? [p.main_image] : [],
              description: p.description,
              condition: attrs.condition || 'new',
              warranty: attrs.warranty || '12 months'
          }
       };
    }) || [];
  }
}

export const removeFromCart = async (itemId: string) => {
  const { data: { user } } = await supabase.auth.getUser()

  // itemId is expected to be the Product ID now (see getCartItems)
  const productId = itemId;

  if (user) {
    return await (supabase as any)
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);
  } else {
    const sessionId = getOrCreateSessionId();
    return await (supabase as any)
      .from('guest_cart_items')
      .delete()
      .eq('guest_session_id', sessionId)
      .eq('product_id', productId);
  }
}

export const updateCartItemQuantity = async (itemId: string, quantity: number) => {
  const { data: { user } } = await supabase.auth.getUser()
  const productId = itemId;

  if (user) {
    return await (supabase as any)
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', user.id)
      .eq('product_id', productId);
  } else {
    const sessionId = getOrCreateSessionId();
    return await (supabase as any)
      .from('guest_cart_items')
      .update({ quantity })
      .eq('guest_session_id', sessionId)
      .eq('product_id', productId);
  }
}

export const clearCart = async () => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return await (supabase as any)
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);
  } else {
    const sessionId = getOrCreateSessionId();
    return await (supabase as any)
      .from('guest_cart_items')
      .delete()
      .eq('guest_session_id', sessionId);
  }
}


// Merge guest cart with user cart on login
export const mergeGuestCart = async () => {
  try {
    if (localStorage.getItem('cart_merge_done') === 'true') return;

    const guestSessionId = localStorage.getItem('guest_session_id');
    if (!guestSessionId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch Guest Items
    const { data: guestItems } = await (supabase as any)
      .from('guest_cart_items')
      .select('product_id, quantity')
      .eq('guest_session_id', guestSessionId);

    if (!guestItems || guestItems.length === 0) {
      localStorage.removeItem('guest_session_id'); // Just cleanup
      return;
    }

    // 2. Merge into User Cart
    for (const item of guestItems) {
      // Check existing
      const { data: existing } = await (supabase as any)
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (existing) {
        await (supabase as any)
          .from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('user_id', user.id)
          .eq('product_id', item.product_id);
      } else {
        await (supabase as any)
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: item.product_id,
            quantity: item.quantity
          });
      }
    }

    // 3. Cleanup Guest Cart
    await (supabase as any)
      .from('guest_cart_items')
      .delete()
      .eq('guest_session_id', guestSessionId);
    
    localStorage.removeItem('guest_session_id');
    localStorage.setItem('cart_merge_done', 'true');

  } catch (error) {
    console.error('MergeGuestCart: Unexpected error:', error);
  }
}

// Notification helpers
export const createNotification = async (
  userId: string, 
  title: string, 
  message: string, 
  type: string = 'info',
  actionUrl?: string
) => {
  return await (supabase as any)
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link: actionUrl // Schema uses 'link' not 'action_url'
    } as any);
}

export { supabase }