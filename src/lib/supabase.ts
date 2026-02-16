import { supabase } from '@/integrations/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import type {
  Product,
  CartItemData,
  GuestCartItemData,
  UserCart,
  GuestCart,
  Order,
  OrderItem,
  Inventory,
  Payment,
  Notification,
  ActivityLog,
  Category,
  Vendor,
  CartItemResponse,
  GuestCartItemResponse,
  CheckoutFormData,
  ValidationError,
  ApiResponse
} from './types'

// Re-export types for backward compatibility
export type {
  Product,
  CartItemData,
  GuestCartItemData,
  UserCart,
  GuestCart,
  Order,
  OrderItem,
  Inventory,
  Payment,
  Notification,
  ActivityLog,
  Category,
  Vendor,
  CartItemResponse,
  GuestCartItemResponse,
  CheckoutFormData,
  ValidationError,
  ApiResponse
} from './types'

export interface CartItem {
  id: string
  spare_part_id: string
  quantity: number
  spare_part?: any
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
    // Get or create user cart (resilient to RLS/duplicate issues)
    let userCart: { id: string } | null = null;

    // Step 1: Try to SELECT existing cart
    const { data: existingCart, error: selectError } = await supabase
      .from('user_carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCart) {
      userCart = existingCart;
    } else {
      // Step 2: Cart not found (or RLS blocked read). Try to INSERT.
      const { data: newCart, error: insertError } = await supabase
        .from('user_carts')
        .insert({ user_id: user.id })
        .select('id')
        .maybeSingle();

      if (newCart) {
        userCart = newCart;
      } else if (insertError?.code === '23505') {
        // Step 3: Duplicate! Cart exists but we couldn't see it earlier.
        // Re-select — this time it MUST exist.
        const { data: retryCart } = await supabase
          .from('user_carts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        userCart = retryCart;
      } else if (insertError) {
        console.error('Failed to create cart:', insertError);
        throw insertError;
      }
    }

    if (!userCart) {
      console.error('Could not get or create user cart. Check RLS policies on user_carts.');
      throw new Error('Cart unavailable. Please try again.');
    }

    // Check if item already exists in cart
    const { data: existing } = await supabase
      .from('cart_items')
      .select('quantity, id')
      .eq('cart_id', userCart.id)
      .eq('product_id', parseInt(sparePartId))
      .maybeSingle();

    if (existing) {
       return await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
    } else {
       return await supabase
        .from('cart_items')
        .insert({
          cart_id: userCart.id,
          product_id: parseInt(sparePartId),
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
      .eq('product_id', parseInt(sparePartId))
      .maybeSingle();

    if (existing) {
      return await (supabase as any)
        .from('guest_cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('guest_session_id', sessionId)
        .eq('product_id', parseInt(sparePartId));
    } else {
      return await (supabase as any)
        .from('guest_cart_items')
        .insert({
          guest_session_id: sessionId,
          product_id: parseInt(sparePartId),
          quantity
        });
    }
  }
}

export const getCartItems = async (): Promise<CartItem[]> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Get user cart first
    const { data: userCart } = await supabase
      .from('user_carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userCart) return [];

    // User Cart Items
    const { data: items, error } = await supabase
      .from('cart_items')
      .select(`
        id,
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
      .eq('cart_id', userCart.id);

    if (error) console.error("Error fetching cart", error);

     return items?.map((item: any) => {
        const p = item.product || {};
        const attrs = p.attributes || {};
        return {
           id: String(item.id),
           spare_part_id: String(item.product_id),
           quantity: item.quantity,
           spare_part: {
               id: String(p.id),
               name: p.name,
               price: p.price,
               part_number: p.sku || '',
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
           id: String(item.product_id),
           spare_part_id: String(item.product_id),
           quantity: item.quantity,
           spare_part: {
               id: String(p.id),
               name: p.name, 
               price: p.price,
               part_number: p.sku || '',
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

  if (user) {
    return await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
  } else {
    const sessionId = getOrCreateSessionId();
    return await supabase
      .from('guest_cart_items')
      .delete()
      .eq('guest_session_id', sessionId)
      .eq('product_id', parseInt(itemId));
  }
}

export const updateCartItemQuantity = async (itemId: string, quantity: number) => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);
  } else {
    const sessionId = getOrCreateSessionId();
    return await supabase
      .from('guest_cart_items')
      .update({ quantity })
      .eq('guest_session_id', sessionId)
      .eq('product_id', parseInt(itemId));
  }
}

export const clearCart = async () => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userCart } = await supabase
      .from('user_carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userCart) {
      return await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', userCart.id);
    }
  } else {
    const sessionId = getOrCreateSessionId();
    return await supabase
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

    // Get or create user cart
    let { data: userCart } = await supabase
      .from('user_carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userCart) {
      const { data: newCart, error: cartError } = await supabase
        .from('user_carts')
        .insert({ user_id: user.id })
        .select('id')
        .single();

      if (cartError) throw cartError;
      userCart = newCart;
    }

    // 1. Fetch Guest Items
    const { data: guestItems } = await supabase
      .from('guest_cart_items')
      .select('product_id, quantity')
      .eq('guest_session_id', guestSessionId);

    if (!guestItems || guestItems.length === 0) {
      localStorage.removeItem('guest_session_id');
      return;
    }

    // 2. Merge into User Cart
    for (const item of guestItems) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('quantity, id')
        .eq('cart_id', userCart.id)
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('cart_items')
          .insert({
            cart_id: userCart.id,
            product_id: item.product_id,
            quantity: item.quantity
          });
      }
    }

    // 3. Cleanup Guest Cart
    await supabase
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
  type: Notification['type'] = 'info',
  actionUrl?: string
): Promise<{ data: Notification | null; error: any }> => {
  return await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link: actionUrl
    })
    .select()
    .single();
}

export { supabase }
