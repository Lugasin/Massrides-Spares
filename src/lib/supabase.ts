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
  email: string
  full_name?: string
  phone?: string
  company_name?: string
  role: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
  created_at: string
  updated_at: string
  metadata?: any
}

const CART_MERGE_STATE_KEY = 'cart_merge_done'

const clearCartMergeState = () => {
  localStorage.removeItem(CART_MERGE_STATE_KEY)
}

const getCartMergeFingerprint = (userId: string, guestSessionId: string) =>
  `${userId}:${guestSessionId}`

const getStoredCartMergeFingerprint = () => {
  const storedValue = localStorage.getItem(CART_MERGE_STATE_KEY)

  if (!storedValue || storedValue === 'true') {
    if (storedValue === 'true') {
      clearCartMergeState()
    }
    return null
  }

  return storedValue
}

// Session management for guest carts
export const getOrCreateSessionId = (): string => {
  let sessionId = localStorage.getItem('guest_session_id')
  if (!sessionId) {
    sessionId = uuidv4()
    localStorage.setItem('guest_session_id', sessionId)
    clearCartMergeState()
  }
  return sessionId
}

export const ensureGuestSession = async (token: string) => {
  try {
    const { error } = await supabase
      .from('guest_sessions')
      .upsert({ token }, { onConflict: 'token' });
    
    if (error) {
      console.error("Failed to ensure guest session in database:", error);
      throw error;
    }
  } catch (error) {
    console.error("Critical error in ensureGuestSession:", error);
  }
}

const getOrCreateCart = async (userId: string | null, guestToken: string | null) => {
  // If this is a guest, make sure the session exists in the DB first
  // to avoid 23503 FK violations in the carts table.
  if (!userId && guestToken) {
    await ensureGuestSession(guestToken);
  }

  const query = supabase.from('carts').select('*');
  
  if (userId) {
    query.eq('user_id', userId);
  } else if (guestToken) {
    query.eq('guest_token', guestToken);
  } else {
    throw new Error('Neither userId nor guestToken provided for cart');
  }

  const { data: existingCart, error: selectError } = await query.maybeSingle();

  if (selectError) throw selectError;
  if (existingCart) return existingCart;

  const { data: newCart, error: insertError } = await supabase
    .from('carts')
    .insert({ 
      user_id: userId, 
      guest_token: guestToken,
      items: [] 
    })
    .select('*')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
       // 23505 is Unique Violation: another concurrent call already created it.
       const { data: retryCart } = await query.single();
       if (retryCart) return retryCart;
    }
    throw insertError;
  }
  return newCart;
}

// Cart management
export const addToCart = async (productId: string, quantity: number = 1) => {
  const { data: { user } } = await supabase.auth.getUser();
  const guestToken = user ? null : getOrCreateSessionId();
  
  const cart = await getOrCreateCart(user?.id || null, guestToken);
  const items = (Array.isArray(cart.items) ? [...cart.items] : []) as any[];
  
  const existingItemIndex = items.findIndex((item: any) => item.product_id === parseInt(productId));

  if (existingItemIndex > -1) {
    items[existingItemIndex].quantity += quantity;
    items[existingItemIndex].updated_at = new Date().toISOString();
  } else {
    items.push({
      product_id: parseInt(productId),
      quantity,
      added_at: new Date().toISOString()
    });
  }

  return await supabase
    .from('carts')
    .update({ items })
    .eq('id', cart.id);
}

export const getCartItems = async (): Promise<CartItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const guestToken = user ? null : getOrCreateSessionId();
  
  const cart = await getOrCreateCart(user?.id || null, guestToken);
  const cartItems = Array.isArray(cart.items) ? cart.items : [];
  
  if (cartItems.length === 0) return [];

  const productIds = cartItems.map((item: any) => item.product_id);
  
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds);

  if (error) {
    console.error("Error fetching products for cart", error);
    return [];
  }

  return cartItems.map((item: any) => {
    const p = (products?.find((prod: any) => prod.id === item.product_id) || {}) as any;
    const attrs = p.attributes || {};
    return {
      id: String(item.product_id), // Use product_id as string ID for contextual consistency
      spare_part_id: String(item.product_id),
      quantity: item.quantity,
      spare_part: {
        id: String(p.id),
        name: p.title || 'Unknown Product',
        price: p.price || 0,
        currency: 'USD',
        part_number: p.sku || '',
        brand: attrs.brand || 'Generic',
        images: p.images || [],
        description: p.description,
        condition: p.condition || 'new'
      }
    };
  });
}

export const removeFromCart = async (productId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  const guestToken = user ? null : getOrCreateSessionId();
  
  const cart = await getOrCreateCart(user?.id || null, guestToken);
  const items = (Array.isArray(cart.items) ? cart.items.filter((item: any) => item.product_id !== parseInt(productId)) : []) as any[];

  return await supabase
    .from('carts')
    .update({ items })
    .eq('id', cart.id);
}

export const updateCartItemQuantity = async (productId: string, quantity: number) => {
  if (quantity <= 0) return removeFromCart(productId);

  const { data: { user } } = await supabase.auth.getUser();
  const guestToken = user ? null : getOrCreateSessionId();
  
  const cart = await getOrCreateCart(user?.id || null, guestToken);
  const items = (Array.isArray(cart.items) ? [...cart.items] : []) as any[];
  
  const itemIndex = items.findIndex((item: any) => item.product_id === parseInt(productId));
  if (itemIndex > -1) {
    items[itemIndex].quantity = quantity;
    items[itemIndex].updated_at = new Date().toISOString();
  }

  return await supabase
    .from('carts')
    .update({ items })
    .eq('id', cart.id);
}

export const clearCart = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const guestToken = user ? null : getOrCreateSessionId();
  
  const cart = await getOrCreateCart(user?.id || null, guestToken);

  return await supabase
    .from('carts')
    .update({ items: [] })
    .eq('id', cart.id);
}

// Merge guest cart with user cart on login
export const mergeGuestCart = async () => {
  try {
    const guestToken = localStorage.getItem('guest_session_id');
    if (!guestToken) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const mergeFingerprint = getCartMergeFingerprint(user.id, guestToken);
    if (getStoredCartMergeFingerprint() === mergeFingerprint) return;

    const { data: guestCart } = await supabase
      .from('carts')
      .select('*')
      .eq('guest_token', guestToken)
      .maybeSingle();

    if (!guestCart || !Array.isArray(guestCart.items) || guestCart.items.length === 0) {
      localStorage.removeItem('guest_session_id');
      return;
    }

    const { data: userCart } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const resultItems = (userCart && Array.isArray(userCart.items) ? [...userCart.items] : []) as any[];

    for (const guestItem of (guestCart.items as any[])) {
      const existingIndex = resultItems.findIndex((item: any) => item.product_id === guestItem.product_id);
      if (existingIndex > -1) {
        resultItems[existingIndex].quantity += guestItem.quantity;
      } else {
        resultItems.push(guestItem);
      }
    }

    // Save to user cart
    if (userCart) {
      await supabase.from('carts').update({ items: resultItems }).eq('id', userCart.id);
    } else {
      await supabase.from('carts').insert({ user_id: user.id, items: resultItems });
    }

    // Delete guest cart
    await supabase.from('carts').delete().eq('id', guestCart.id);

    localStorage.removeItem('guest_session_id');
    localStorage.setItem(CART_MERGE_STATE_KEY, mergeFingerprint);
  } catch (error) {
    console.error('MergeGuestCart: error:', error);
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
