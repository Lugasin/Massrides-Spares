
import { supabase } from '@/integrations/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  product?: any
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

/**
 * Gets or creates a cart for the current user or guest session.
 * Returns the cart ID.
 */
const getOrCreateCart = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser()
  const sessionId = getOrCreateSessionId()

  let cartId: string | null = null

  if (user) {
    // 1. Try to find an existing cart for the user
    const { data: existingCart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingCart) {
      cartId = existingCart.id
    } else {
      // 2. Create a new cart for the user
      const { data: newCart, error } = await supabase
        .from('carts')
        .insert({ user_id: user.id })
        .select('id')
        .single()

      if (error) throw error
      cartId = newCart.id
    }
  } else {
    // 1. Try to find an existing cart for the guest session
    const { data: existingCart } = await supabase
      .from('carts')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (existingCart) {
      cartId = existingCart.id
    } else {
      // 2. Create a new cart for the guest session
      const { data: newCart, error } = await supabase
        .from('carts')
        .insert({ session_id: sessionId })
        .select('id')
        .single()

      if (error) throw error
      cartId = newCart.id
    }
  }

  return cartId!
}


export const addToCart = async (productId: string, quantity: number = 1) => {
  const cartId = await getOrCreateCart()

  // Check if item exists in the cart
  const { data: existingItem } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId) // cast to any if TS complains about bigint vs string, but usually auto-handled
    .maybeSingle()

  if (existingItem) {
    return await supabase
      .from('cart_items')
      .update({ quantity: existingItem.quantity + quantity })
      .eq('id', existingItem.id)
  } else {
    return await supabase
      .from('cart_items')
      .insert({
        cart_id: cartId,
        product_id: productId,
        quantity
      })
  }
}

export const getCartItems = async (): Promise<CartItem[]> => {
  // We can't easily query "cart_items" directly without knowing the cart_id first,
  // or we need a join. But RLS might restrict us to only seeing our own cart's items.
  // The 'getOrCreateCart' logic is safe.

  const { data: { user } } = await supabase.auth.getUser()
  const sessionId = getOrCreateSessionId()

  // Simplified query: find the cart, then its items
  // Alternatively, if we have RLS set up on cart_items to allow reading based on cart->user_id,
  // we could try a direct join, but finding the cart ID first is robust.

  let cartId: string | null = null

  if (user) {
    const { data } = await supabase.from('carts').select('id').eq('user_id', user.id).maybeSingle()
    cartId = data?.id || null
  } else {
    const { data } = await supabase.from('carts').select('id').eq('session_id', sessionId).maybeSingle()
    cartId = data?.id || null
  }

  if (!cartId) return []

  const { data: items, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      product:products (
        id,
        name,
        price,
        part_number,
        main_image,
        description,
        attributes
      )
    `)
    .eq('cart_id', cartId)

  if (error) {
    console.error("Error fetching cart items:", error)
    return []
  }

  return items.map((item: any) => {
    const p = item.product || {}
    // Map to the shape expected by context
    return {
      id: item.id, // This is the cart_item UUID
      product_id: String(item.product_id),
      quantity: item.quantity,
      product: p // Keep raw product data for context mapping
    }
  })
}

export const removeFromCart = async (cartItemId: string) => {
  // We expect the UI to pass the cart_item.id (UUID), not the product_id
  return await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
}

export const updateCartItemQuantity = async (cartItemId: string, quantity: number) => {
  return await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId)
}

export const clearCart = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const sessionId = getOrCreateSessionId()

  // Find the cart first
  let cartId: string | null = null
  if (user) {
    const { data } = await supabase.from('carts').select('id').eq('user_id', user.id).maybeSingle()
    cartId = data?.id || null
  } else {
    const { data } = await supabase.from('carts').select('id').eq('session_id', sessionId).maybeSingle()
    cartId = data?.id || null
  }

  if (cartId) {
    return await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
  }
}

// Merge guest cart with user cart on login
export const mergeGuestCart = async () => {
  const guestSessionId = localStorage.getItem('guest_session_id')
  if (!guestSessionId) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 1. Get Guest Cart
  const { data: guestCart } = await supabase
    .from('carts')
    .select('id')
    .eq('session_id', guestSessionId)
    .maybeSingle()

  if (!guestCart) {
    localStorage.removeItem('guest_session_id')
    return
  }

  // 2. Get (or create) User Cart
  let userCartId = await getOrCreateCart()

  // 3. Move items
  const { data: guestItems } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', guestCart.id)

  if (guestItems && guestItems.length > 0) {
    for (const item of guestItems) {
       // Check if item exists in user cart
       const { data: existingUserItem } = await supabase
         .from('cart_items')
         .select('id, quantity')
         .eq('cart_id', userCartId)
         .eq('product_id', item.product_id)
         .maybeSingle()

       if (existingUserItem) {
         await supabase
           .from('cart_items')
           .update({ quantity: existingUserItem.quantity + item.quantity })
           .eq('id', existingUserItem.id)

         // Delete the guest item since we merged it
         await supabase.from('cart_items').delete().eq('id', item.id)
       } else {
         // Re-assign the item to the new cart
         await supabase
           .from('cart_items')
           .update({ cart_id: userCartId })
           .eq('id', item.id)
       }
    }
  }

  // 4. Delete the empty guest cart
  await supabase.from('carts').delete().eq('id', guestCart.id)
  localStorage.removeItem('guest_session_id')
}

export { supabase }
