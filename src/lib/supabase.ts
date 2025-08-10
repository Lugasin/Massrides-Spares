import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

// Import types from the new data structure
export type { SparePart } from '@/data/sparePartsData';

export interface Category {
  id: string
  name: string
  description?: string
  image_url?: string
  created_at: string
}

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  product?: SparePart
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

    // Handle potential RLS error or no guest cart found
    if (!guestCart) {
        // Attempt to create if not found (handles initial guest interaction)
        const { data: newGuestCart, error: createError } = await supabase
            .from('guest_carts')
            .insert({ session_id: sessionId })
            .select('id')
            .single();

        if (createError) {
            console.error('Error creating guest cart:', createError);
            return { error: createError };
        }
        guestCart = newGuestCart;
    }


    if (!guestCart) {
      const { data: newGuestCart, error } = await supabase
        .from('guest_carts')
        .insert({ session_id: sessionId })
        .select('id')
        .single()

      if (error) return { error }
      guestCart = newGuestCart
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
        spare_part:spare_parts(*)
      `)
      .eq('cart_id', cart.id);

    return items?.map(item => ({
      id: item.id,
      product_id: item.spare_part.id,
      quantity: item.quantity,
      product: item.spare_part
    })) || [];
  } else {
    // Guest user - get guest cart
    const sessionId = getOrCreateSessionId()

    const { data: guestCart } = await supabase
      .from('guest_carts')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    // Handle potential RLS error or no guest cart found
    if (!guestCart) {
        // No guest cart found, return empty array
        return [];
    }


    const { data: items } = await supabase
      .from('guest_cart_items')
      .select(`
        id,
        quantity,
        spare_part:spare_parts(*)
      `)
      .eq('guest_cart_id', guestCart.id)

    return items?.map(item => ({
      id: item.id,
      product_id: item.spare_part.id,
      quantity: item.quantity,
      product: item.spare_part
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
      .then(({ data, error }) => {
          if (error) console.error('Error removing guest item:', error);
          return { data, error };
      });
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
  const sessionId = localStorage.getItem('guest_session_id')
  if (!sessionId) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return

  // Get guest cart items
  const { data: guestCart } = await supabase
    .from('guest_carts')
    .select('id')
    .eq('session_id', sessionId)
    .single()

  if (!guestCart) return

  // Get guest cart items
  const { data: guestItems } = await supabase
    .from('guest_cart_items')
    .select('spare_part_id, quantity')
    .eq('guest_cart_id', guestCart.id)

  if (!guestItems || guestItems.length === 0) return

  // Get or create user cart
  let { data: userCart } = await supabase
    .from('user_carts')
    .select('id')
    .eq('user_id', profile.id)
    .single();

  if (!userCart) {
    const { data: newCart } = await supabase
      .from('user_carts')
      .insert({ user_id: profile.id })
      .select('id')
      .single();
    userCart = newCart;
  }

  // Merge items
  for (const item of guestItems) {
    await supabase
      .from('cart_items')
      .upsert({
        cart_id: userCart!.id,
        spare_part_id: item.spare_part_id,
        quantity: item.quantity
      });
  }
  
  // Delete guest cart
  await supabase
    .from('guest_carts')
    .delete()
    .eq('id', guestCart.id)

  // Clear session
  localStorage.removeItem('guest_session_id')
}

export { supabase }