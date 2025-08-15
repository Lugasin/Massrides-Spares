import { supabase } from './supabase';

export async function getOrCreateGuestCart(sessionId: string) {
  const { data, error, status } = await supabase
    .from('guest_carts')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error && status !== 406) throw error; // not-found is OK

  if (!data) {
    const { data: created, error: insertErr } = await supabase
      .from('guest_carts')
      .insert({ session_id: sessionId })
      .select('id')
      .single();
    if (insertErr) throw insertErr;
    return created;
  }
  return data;
}

export async function getGuestCartItems(cartId: string) {
  const { data, error } = await supabase
    .from('guest_cart_items')
    .select(`
      id,
      quantity,
      added_at,
      spare_parts!inner(
        id,
        name,
        price,
        images,
        brand,
        part_number
      )
    `)
    .eq('guest_cart_id', cartId);

  if (error) throw error;
  return data || [];
}

export async function addGuestCartItem(cartId: string, sparePartId: string, quantity: number = 1) {
  // Check if item already exists
  const { data: existing } = await supabase
    .from('guest_cart_items')
    .select('id, quantity')
    .eq('guest_cart_id', cartId)
    .eq('spare_part_id', sparePartId)
    .maybeSingle();

  if (existing) {
    // Update quantity
    const { error } = await supabase
      .from('guest_cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    // Insert new item
    const { error } = await supabase
      .from('guest_cart_items')
      .insert({
        guest_cart_id: cartId,
        spare_part_id: sparePartId,
        quantity
      });
    if (error) throw error;
  }
}

export async function removeGuestCartItem(cartId: string, sparePartId: string) {
  const { error } = await supabase
    .from('guest_cart_items')
    .delete()
    .eq('guest_cart_id', cartId)
    .eq('spare_part_id', sparePartId);
  
  if (error) throw error;
}

export async function clearGuestCart(cartId: string) {
  const { error } = await supabase
    .from('guest_cart_items')
    .delete()
    .eq('guest_cart_id', cartId);
  
  if (error) throw error;
}