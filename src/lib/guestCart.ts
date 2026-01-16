import { supabase } from './supabase';

export async function getOrCreateGuestCart(sessionId: string) {
  // Use upsert to handle race conditions and prevent 409 Conflict
  const { data, error } = await supabase
    .from('guest_carts')
    .upsert(
      { session_id: sessionId },
      { onConflict: 'session_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
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
  
  // Transform to match CartItem interface if necessary, or return as is
  return data || [];
}

export async function addGuestCartItem(cartId: string, sparePartId: string, quantity: number = 1) {
  // Check if item already exists to update quantity
  // We use maybeSingle to avoid errors if not found
  const { data: existing } = await supabase
    .from('guest_cart_items')
    .select('id, quantity')
    .eq('guest_cart_id', cartId)
    .eq('spare_part_id', sparePartId) // Use correct column name
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
        spare_part_id: sparePartId, // Ensure this matches DB column
        quantity
      });
    if (error) throw error;
  }
}

export async function updateGuestCartItemQuantity(itemId: string, quantity: number) {
  if (quantity <= 0) {
    return removeGuestCartItem(itemId);
  }

  const { error } = await supabase
    .from('guest_cart_items')
    .update({ quantity })
    .eq('id', itemId);
  
  if (error) throw error;
}

export async function removeGuestCartItem(itemId: string) {
  const { error, count } = await supabase
    .from('guest_cart_items')
    .delete({ count: 'exact' })
    .eq('id', itemId);
  
  if (error) throw error;
  // Optional: check count if needed, but silent success is often fine for delete
}

export async function clearGuestCart(cartId: string) {
  const { error } = await supabase
    .from('guest_cart_items')
    .delete()
    .eq('guest_cart_id', cartId);
  
  if (error) throw error;
}
