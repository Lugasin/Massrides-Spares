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
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return { error: 'User profile not found' };

    // Get or create user cart
    let { data: cart } = await supabase
      .from('user_carts')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (!cart) {
      const { data: newCart, error } = await supabase
        .from('user_carts')
        .insert({ user_id: profile.id })
        .select('id')
        .single();
      if (error) return { error };
      cart = newCart;
    }

    // Check if item exists
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('spare_part_id', sparePartId)
      .single();

    if (existingItem) {
      return await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);
    } else {
      return await supabase
        .from('cart_items')
        .insert({ 
          cart_id: cart.id, 
          spare_part_id: sparePartId, 
          quantity 
        });
    }

  } else {
    // Guest user - use guest cart
    const sessionId = getOrCreateSessionId()

    // Get or create guest cart
    let { data: guestCart } = await supabase
      .from('guest_carts')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (!guestCart) {
      const { data: newGuestCart, error } = await supabase
        .from('guest_carts')
        .insert({ session_id: sessionId })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating guest cart:', error);
        return { error };
      }
      guestCart = newGuestCart;
    }

    // Add item to guest cart or update quantity
    const { data: existingItem } = await supabase
      .from('guest_cart_items')
      .select('id, quantity')
      .eq('guest_cart_id', guestCart.id)
      .eq('spare_part_id', sparePartId)
      .single()

    if (existingItem) {
      return await supabase
        .from('guest_cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
    } else {
      return await supabase
        .from('guest_cart_items')
        .insert({ guest_cart_id: guestCart.id, spare_part_id: sparePartId, quantity })
    }
  }
}

export const getCartItems = async (): Promise<CartItem[]> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return [];

    const { data: cart } = await supabase
      .from('user_carts')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (!cart) return [];

    const { data: items } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        spare_part_id,
        spare_part:spare_parts(
          id,
          name,
          price,
          part_number,
          brand,
          images,
          description,
          condition,
          warranty
        )
      `)
      .eq('cart_id', cart.id);

    return items?.map(item => ({
      id: item.id,
      spare_part_id: item.spare_part_id,
      quantity: item.quantity,
      spare_part: item.spare_part as any
    })) || [];
  } else {
    // Guest user - get guest cart
    const sessionId = getOrCreateSessionId()

    const { data: guestCart } = await supabase
      .from('guest_carts')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (!guestCart) {
      return [];
    }

    const { data: items } = await supabase
      .from('guest_cart_items')
      .select(`
        id,
        quantity,
        spare_part_id,
        spare_part:spare_parts(
          id,
          name,
          price,
          part_number,
          brand,
          images,
          description,
          condition,
          warranty
        )
      `)
      .eq('guest_cart_id', guestCart.id)

    return items?.map(item => ({
      id: item.id,
      spare_part_id: item.spare_part_id,
      quantity: item.quantity,
      spare_part: item.spare_part as any
    })) || [];
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
    return await supabase
      .from('guest_cart_items')
      .delete()
      .eq('id', itemId)
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
    return await supabase
      .from('guest_cart_items')
      .update({ quantity })
      .eq('id', itemId)
  }
}

// Merge guest cart with user cart on login
export const mergeGuestCart = async () => {
  const guest_session_id = localStorage.getItem('guest_session_id')
  if (!guest_session_id) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  try {
    const { error } = await supabase.functions.invoke('merge-guest-cart', {
      body: { guest_session_id }
    });
    if (error) throw error;

    // Clear session on successful merge
    localStorage.removeItem('guest_session_id');
  } catch (error) {
    console.error("Error merging guest cart:", error);
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
  return await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      action_url: actionUrl
    });
}

export { supabase }