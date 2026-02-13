import { supabase } from '@/integrations/supabase/client'
// Force rebuild: Fixed mergeGuestCart logic
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'

export interface CartItem {
  id: string
  spare_part_id: string
  quantity: number
  spare_part?: any 
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
    // User Cart: 1. Get Cart ID
    const { data: cart } = await (supabase as any)
      .from('user_carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!cart) {
      // Should handle creation, but let's assume it exists or fail cleanly for now
      // Ideally call a helper or just throw/create
      // For robustness:
       await (supabase as any).from('user_carts').insert({ user_id: user.id });
       // retry fetch
       // (Simplified for now to match RPC auto-healing expectations)
    }
    
    // We need the cart_id. Let's get it properly.
    // If we rely on RPC auto-create, frontend might trail behind.
    // Better: Ensure we have cart_id.
    
    let cartId = cart?.id;
    if (!cartId) {
       const { data: newCart } = await (supabase as any)
         .from('user_carts')
         .insert({ user_id: user.id })
         .select('id')
         .single();
       cartId = newCart?.id;
    }

    if (!cartId) throw new Error("Could not get or create user cart");

    // 2. Check Item
    const { data: existing } = await (supabase as any)
      .from('cart_items')
      .select('quantity')
      .eq('cart_id', cartId) // Use cart_id, not user_id if schema changed, but verify schema?
      // Schema says: cart_items has cart_id AND user_id. 
      // Let's check schema again. `cart_items` table:
      // cart_id uuid, spare_part_id uuid, quantity int, user_id uuid
      // It has BOTH. But RPC joins on `cart_items.cart_id = v_cart_id`.
      // So we MUST set cart_id.
      .eq('spare_part_id', sparePartId)
      .maybeSingle();

    if (existing) {
       return await (supabase as any)
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('cart_id', cartId)
        .eq('spare_part_id', sparePartId);
    } else {
       return await (supabase as any)
        .from('cart_items')
        .insert({
          cart_id: cartId, // CRITICAL FIX
          user_id: user.id, // Keep user_id for RLS/redundancy
          spare_part_id: sparePartId,
          quantity
        });
    }

  } else {
    // Guest Cart
    const sessionId = getOrCreateSessionId();

    const { data: existing } = await (supabase as any)
      .from('guest_cart_items')
      .select('quantity')
      .eq('guest_session_id', sessionId)
      .eq('spare_part_id', sparePartId)
      .maybeSingle();

    if (existing) {
      return await (supabase as any)
        .from('guest_cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('guest_session_id', sessionId)
        .eq('spare_part_id', sparePartId);
    } else {
      return await (supabase as any)
        .from('guest_cart_items')
        .insert({
          guest_session_id: sessionId,
          spare_part_id: sparePartId,
          quantity
        });
    }
  }
}

export const getCartItems = async (): Promise<CartItem[]> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Get Cart ID first
    const { data: cart } = await (supabase as any)
      .from('user_carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (!cart) return []; // No cart = no items

    // User Cart Items
    const { data: items, error } = await (supabase as any)
      .from('cart_items')
      .select(`
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
      .eq('cart_id', cart.id); // Use cart_id

    if (error) console.error("Error fetching cart", error);

    return items?.map((item: any) => {
       const p = item.spare_part || {};
       return {
          id: String(item.spare_part_id),
          spare_part_id: String(item.spare_part_id),
          quantity: item.quantity,
          spare_part: {
              id: String(p.id),
              name: p.name, 
              price: p.price,
              part_number: p.part_number,
              brand: p.brand || 'Generic',
              images: p.images || [],
              description: p.description,
              condition: p.condition || 'new',
              warranty: p.warranty || '12 months'
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
      .eq('guest_session_id', sessionId)

    if (error) console.error("Error fetching guest cart", error);

    return items?.map((item: any) => {
       const p = item.spare_part || {};
       return {
          id: String(item.spare_part_id),
          spare_part_id: String(item.spare_part_id),
          quantity: item.quantity,
          spare_part: {
              id: String(p.id),
              name: p.name, 
              price: p.price,
              part_number: p.part_number,
              brand: p.brand || 'Generic',
              images: p.images || [],
              description: p.description,
              condition: p.condition || 'new',
              warranty: p.warranty || '12 months'
          }
       };
    }) || [];
  }
}

export const removeFromCart = async (itemId: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  const productId = itemId;

  if (user) {
    const { data: cart } = await (supabase as any).from('user_carts').select('id').eq('user_id', user.id).maybeSingle();
    if (!cart) return;

    return await (supabase as any)
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)
      .eq('spare_part_id', productId);
  } else {
    const sessionId = getOrCreateSessionId();
    return await (supabase as any)
      .from('guest_cart_items')
      .delete()
      .eq('guest_session_id', sessionId)
      .eq('spare_part_id', productId);
  }
}

export const updateCartItemQuantity = async (itemId: string, quantity: number) => {
  const { data: { user } } = await supabase.auth.getUser()
  const productId = itemId;

  if (user) {
    const { data: cart } = await (supabase as any).from('user_carts').select('id').eq('user_id', user.id).maybeSingle();
    if (!cart) return;

    return await (supabase as any)
      .from('cart_items')
      .update({ quantity })
      .eq('cart_id', cart.id)
      .eq('spare_part_id', productId);
  } else {
    const sessionId = getOrCreateSessionId();
    return await (supabase as any)
      .from('guest_cart_items')
      .update({ quantity })
      .eq('guest_session_id', sessionId)
      .eq('spare_part_id', productId);
  }
}

export const clearCart = async () => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: cart } = await (supabase as any).from('user_carts').select('id').eq('user_id', user.id).maybeSingle();
    if (!cart) return;

    return await (supabase as any)
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);
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
      .select('spare_part_id, quantity')
      .eq('guest_session_id', guestSessionId);

    if (!guestItems || guestItems.length === 0) {
      localStorage.removeItem('guest_session_id');
      return;
    }

    // 2. Merge into User Cart
    for (const item of guestItems) {
      const { data: existing } = await (supabase as any)
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('spare_part_id', item.spare_part_id)
        .maybeSingle();

      if (existing) {
        await (supabase as any)
          .from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('user_id', user.id)
          .eq('spare_part_id', item.spare_part_id);
      } else {
        await (supabase as any)
          .from('cart_items')
          .insert({
            user_id: user.id,
            spare_part_id: item.spare_part_id,
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
      link: actionUrl
    } as any);
}
