import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface UserProfile {
  id: string
  first_name?: string
  last_name?: string
  company?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  role_id?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  short_description?: string
  sku?: string
  category_id?: string
  price: number
  compare_price?: number
  inventory_quantity: number
  is_featured: boolean
  is_active: boolean
  tags?: string[]
  specifications?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  cart_id: string
  product_id: string
  quantity: number
  price: number
  product: Product
}

export interface Order {
  id: string
  user_id?: string
  order_number: string
  status: string
  currency: string
  subtotal: number
  tax_amount: number
  shipping_amount: number
  total_amount: number
  customer_email: string
  customer_phone?: string
  billing_first_name: string
  billing_last_name: string
  payment_status: string
  created_at: string
  updated_at: string
}

// Auth helpers
export const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
  
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Cart helpers
export const addToCart = async (productId: string, quantity: number = 1) => {
  const user = await getCurrentUser()
  
  if (user) {
    // Add to user cart
    return await addToUserCart(user.id, productId, quantity)
  } else {
    // Add to guest cart
    return await addToGuestCart(productId, quantity)
  }
}

export const addToUserCart = async (userId: string, productId: string, quantity: number) => {
  // Get or create user cart
  let { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (cartError && cartError.code === 'PGRST116') {
    // Cart doesn't exist, create it
    const { data: newCart, error: createError } = await supabase
      .from('carts')
      .insert({ user_id: userId })
      .select('id')
      .single()
    
    if (createError) return { error: createError }
    cart = newCart
  } else if (cartError) {
    return { error: cartError }
  }

  // Get product price
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('price')
    .eq('id', productId)
    .single()

  if (productError) return { error: productError }

  // Add or update cart item
  const { data, error } = await supabase
    .from('cart_items')
    .upsert({
      cart_id: cart.id,
      product_id: productId,
      quantity,
      price: product.price
    }, {
      onConflict: 'cart_id,product_id'
    })

  return { data, error }
}

export const addToGuestCart = async (productId: string, quantity: number) => {
  const sessionId = getOrCreateSessionId()
  
  // Get or create guest cart
  let { data: cart, error: cartError } = await supabase
    .from('guest_carts')
    .select('id')
    .eq('session_id', sessionId)
    .single()

  if (cartError && cartError.code === 'PGRST116') {
    // Cart doesn't exist, create it
    const { data: newCart, error: createError } = await supabase
      .from('guest_carts')
      .insert({ session_id: sessionId })
      .select('id')
      .single()
    
    if (createError) return { error: createError }
    cart = newCart
  } else if (cartError) {
    return { error: cartError }
  }

  // Get product price
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('price')
    .eq('id', productId)
    .single()

  if (productError) return { error: productError }

  // Add or update cart item
  const { data, error } = await supabase
    .from('guest_cart_items')
    .upsert({
      cart_id: cart.id,
      product_id: productId,
      quantity,
      price: product.price
    }, {
      onConflict: 'cart_id,product_id'
    })

  return { data, error }
}

export const getCartItems = async () => {
  const user = await getCurrentUser()
  
  if (user) {
    return await getUserCartItems(user.id)
  } else {
    return await getGuestCartItems()
  }
}

export const getUserCartItems = async (userId: string) => {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      product:products(*)
    `)
    .eq('cart_id', (await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single()
    ).data?.id)

  return { data, error }
}

export const getGuestCartItems = async () => {
  const sessionId = getOrCreateSessionId()
  
  const { data, error } = await supabase
    .from('guest_cart_items')
    .select(`
      *,
      product:products(*)
    `)
    .eq('cart_id', (await supabase
      .from('guest_carts')
      .select('id')
      .eq('session_id', sessionId)
      .single()
    ).data?.id)

  return { data, error }
}

export const mergeGuestCart = async () => {
  const sessionId = localStorage.getItem('guest_session_id')
  if (!sessionId) return

  const { error } = await supabase.rpc('merge_guest_cart', {
    guest_session_id: sessionId
  })

  if (!error) {
    localStorage.removeItem('guest_session_id')
  }

  return { error }
}

// Helper function to manage guest session ID
export const getOrCreateSessionId = () => {
  let sessionId = localStorage.getItem('guest_session_id')
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2)}`
    localStorage.setItem('guest_session_id', sessionId)
  }
  return sessionId
}

// Payment helpers
export const createPaymentSession = async (orderData: any) => {
  const user = await getCurrentUser()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (user) {
    const { data: { session } } = await supabase.auth.getSession()
    headers['Authorization'] = `Bearer ${session?.access_token}`
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData)
  })

  return await response.json()
}

export const createOrder = async (orderData: any) => {
  const user = await getCurrentUser()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (user) {
    const { data: { session } } = await supabase.auth.getSession()
    headers['Authorization'] = `Bearer ${session?.access_token}`
  } else {
    // Include guest session ID for guest checkout
    orderData.guest_session_id = getOrCreateSessionId()
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData)
  })

  return await response.json()
}