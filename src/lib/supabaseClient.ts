import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Real-time subscription helpers
export const subscribeToTable = (
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  const channel = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table,
        filter 
      },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// Authentication helpers
export const signUp = async (email: string, password: string, userData?: any) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
      emailRedirectTo: `${window.location.origin}/verify-email`
    }
  });
};

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const resetPassword = async (email: string) => {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
};

// Cart management
export const addToCart = async (sparePartId: string, quantity: number = 1) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    // Get or create user cart
    let { data: cart } = await supabase
      .from('user_carts')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (!cart) {
      const { data: newCart } = await supabase
        .from('user_carts')
        .insert({ user_id: profile.id })
        .select('id')
        .single();
      cart = newCart;
    }

    // Add or update cart item
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart!.id)
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
          cart_id: cart!.id, 
          spare_part_id: sparePartId, 
          quantity 
        });
    }
  } else {
    // Guest cart logic
    const sessionId = localStorage.getItem('guest_session_id') || crypto.randomUUID();
    localStorage.setItem('guest_session_id', sessionId);

    let { data: guestCart } = await supabase
      .from('guest_carts')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!guestCart) {
      const { data: newGuestCart } = await supabase
        .from('guest_carts')
        .insert({ session_id: sessionId })
        .select('id')
        .single();
      guestCart = newGuestCart;
    }

    const { data: existingItem } = await supabase
      .from('guest_cart_items')
      .select('id, quantity')
      .eq('guest_cart_id', guestCart!.id)
      .eq('spare_part_id', sparePartId)
      .single();

    if (existingItem) {
      return await supabase
        .from('guest_cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);
    } else {
      return await supabase
        .from('guest_cart_items')
        .insert({ 
          guest_cart_id: guestCart!.id, 
          spare_part_id: sparePartId, 
          quantity 
        });
    }
  }
};

// Get cart items
export const getCartItems = async () => {
  const { data: { user } } = await supabase.auth.getUser();

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

    return items || [];
  } else {
    const sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) return [];

    const { data: guestCart } = await supabase
      .from('guest_carts')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!guestCart) return [];

    const { data: items } = await supabase
      .from('guest_cart_items')
      .select(`
        id,
        quantity,
        spare_part:spare_parts(*)
      `)
      .eq('guest_cart_id', guestCart.id);

    return items || [];
  }
};

export default supabase;