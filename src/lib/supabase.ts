import { supabase } from '@/integrations/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  phone?: string
  address?: string
  company_name?: string
  role: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  category_id?: string
  vendor_id?: string
  brand?: string
  model?: string
  year?: number
  condition: string
  availability_status: string
  featured: boolean
  images?: string[]
  specifications?: any
  created_at: string
  updated_at: string
}

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
  product?: Product
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
export const addToCart = async (productId: string, quantity: number = 1) => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is logged in - use user cart
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return { error: 'User profile not found' }

    // Get or create user cart
    let { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', profile.id)
      .single()

    if (!cart) {
      const { data: newCart, error } = await supabase
        .from('carts')
        .insert({ user_id: profile.id })
        .select('id')
        .single()

      if (error) return { error }
      cart = newCart
    }

    // Add item to cart or update quantity
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .single()

    if (existingItem) {
      return await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
    } else {
      return await supabase
        .from('cart_items')
        .insert({ cart_id: cart.id, product_id: productId, quantity })
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
        .single()

      if (error) return { error }
      guestCart = newGuestCart
    }

    // Add item to guest cart or update quantity
    const { data: existingItem } = await supabase
      .from('guest_cart_items')
      .select('id, quantity')
      .eq('guest_cart_id', guestCart.id)
      .eq('product_id', productId)
      .single()

    if (existingItem) {
      return await supabase
        .from('guest_cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
    } else {
      return await supabase
        .from('guest_cart_items')
        .insert({ guest_cart_id: guestCart.id, product_id: productId, quantity })
    }
  }
}

export const getCartItems = async (): Promise<CartItem[]> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is logged in - get user cart
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return []

    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', profile.id)
      .single()

    if (!cart) return []

    const { data: items } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        product:products(*)
      `)
      .eq('cart_id', cart.id)

    return items || []
  } else {
    // Guest user - get guest cart
    const sessionId = getOrCreateSessionId()

    const { data: guestCart } = await supabase
      .from('guest_carts')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (!guestCart) return []

    const { data: items } = await supabase
      .from('guest_cart_items')
      .select(`
        id,
        product_id,
        quantity,
        product:products(*)
      `)
      .eq('guest_cart_id', guestCart.id)

    return items || []
  }
}

export const removeFromCart = async (itemId: string) => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
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
      .eq('id', itemId)
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

  const { data: guestItems } = await supabase
    .from('guest_cart_items')
    .select('product_id, quantity')
    .eq('guest_cart_id', guestCart.id)

  if (!guestItems || guestItems.length === 0) return

  // Get or create user cart
  let { data: userCart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', profile.id)
    .single()

  if (!userCart) {
    const { data: newUserCart } = await supabase
      .from('carts')
      .insert({ user_id: profile.id })
      .select('id')
      .single()
    userCart = newUserCart
  }

  // Merge items
  for (const guestItem of guestItems) {
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', userCart!.id)
      .eq('product_id', guestItem.product_id)
      .single()

    if (existingItem) {
      await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + guestItem.quantity })
        .eq('id', existingItem.id)
    } else {
      await supabase
        .from('cart_items')
        .insert({
          cart_id: userCart!.id,
          product_id: guestItem.product_id,
          quantity: guestItem.quantity
        })
    }
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