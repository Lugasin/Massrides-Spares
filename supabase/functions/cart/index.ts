import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import type { Database, Tables } from '../_shared/types.ts'; // Adjust the path based on your structure

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Helper function to create a Supabase client with the auth token
const createSupabaseClient = (authHeader?: string) => {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: authHeader || '' },
    },
    auth: {
        persistSession: false // Don't persist session in Edge Function
    },
  });
  return supabase;
};

serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;
  const authHeader = req.headers.get('Authorization');

  // Create a Supabase client with the user's JWT
  const supabase = createSupabaseClient(authHeader);

  // Authenticate the user and get session (includes JWT verification)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session || !session.access_token) {
    console.error('Authentication failed:', sessionError);
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    });
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  // User is authenticated, get their profile to link to cart
  const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
        console.error('User profile not found for authenticated user:', user.id, profileError);
        return new Response(JSON.stringify({ error: 'User profile not found' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500, // Internal server error as profile should exist for authenticated user
        });
    }

  const userId = profile.id; // Use the user_profiles ID for the cart link

  // Handle different routes and methods
  if (path === '/cart' && method === 'GET') {
    // GET /cart - Fetch user's cart items
    try {
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!cart) {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
          status: 200, // Return empty array if no cart exists
        });
      }

      const { data: cartItems, error: cartItemsError } = await supabase
        .from('cart_items')
        .select(`
            id,
            product_id,
            quantity,
            product:products(*) // Join with products table
        `)
        .eq('cart_id', cart.id);

      if (cartItemsError) {
        console.error('Error fetching cart items:', cartItemsError);
        return new Response(JSON.stringify({ error: cartItemsError.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify(cartItems), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (error) {
      console.error('Error in GET /cart:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch cart' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } else if (path === '/cart/items' && method === 'POST') {
    // POST /cart/items - Add or update item in user's cart
    try {
      const { product_id: productId, quantity } = await req.json();

      if (!productId || typeof quantity !== 'number' || quantity <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid productId or quantity' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Get or create user cart
      let { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (cartError && cartError.code === 'PGRST116') { // No row found error
         // Create new cart if it doesn't exist
         const { data: newCart, error: newCartError } = await supabase
            .from('carts')
            .insert({ user_id: userId })
            .select('id')
            .single();

         if (newCartError) {
             console.error('Error creating new cart:', newCartError);
             return new Response(JSON.stringify({ error: 'Failed to create cart' }), {
                 headers: { 'Content-Type': 'application/json' },
                 status: 500,
             });
         }
         cart = newCart;

      } else if (cartError) {
          console.error('Error fetching cart:', cartError);
          return new Response(JSON.stringify({ error: 'Failed to fetch cart' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500,
          });
      }


      // Check if item already exists in cart
      const { data: existingItem, error: existingItemError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cart!.id) // Use non-null assertion as cart should exist now
        .eq('product_id', productId)
        .single();

      if (existingItemError && existingItemError.code !== 'PGRST116') { // Ignore 'no row found' error
           console.error('Error checking existing cart item:', existingItemError);
           return new Response(JSON.stringify({ error: 'Failed to check existing cart item' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 500,
           });
      }


      if (existingItem) {
        // Update quantity if item exists
        const { data, error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)
          .select();

        if (error) {
          console.error('Error updating cart item quantity:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
          });
        }
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });

      } else {
        // Add new item if it doesn't exist
        type CartItemInsert = Tables<'cart_items'>['Insert'];
        const newItem: CartItemInsert = {
            cart_id: cart!.id,
            product_id: productId as string, // Cast to string to match expected type if needed
            quantity: quantity
        };
        const { data, error } = await supabase
          .from('cart_items')
          .insert({ cart_id: cart!.id, product_id: productId, quantity })
          .select();

        if (error) {
          console.error('Error adding new cart item:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
          });
        }
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
          status: 201, // Created
        });
      }

    } catch (error) {
      console.error('Error in POST /cart/items:', error);
      return new Response(JSON.stringify({ error: 'Failed to add/update cart item' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } else if (path === '/cart/items' && method === 'PUT') {
    // PUT /cart/items - Update quantity of an existing item in user's cart
    try {
      const { item_id: itemId, quantity } = await req.json();

      if (!itemId || typeof quantity !== 'number' || quantity < 0) {
        return new Response(JSON.stringify({ error: 'Invalid itemId or quantity' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .select(); // Select the updated item

      if (error) {
        console.error('Error updating cart item quantity:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }, status: 200 });

    } catch (error) {
      console.error('Error in POST /cart/items:', error);
      return new Response(JSON.stringify({ error: 'Failed to add/update cart item' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } else if (path.startsWith('/cart/items/') && method === 'DELETE') {
    // DELETE /cart/items/:itemId - Remove item from user's cart
    try {
      const itemId = path.split('/').pop();
      if (!itemId) {
        return new Response(JSON.stringify({ error: 'Missing item ID' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Ensure the item belongs to the authenticated user's cart
      const { count, error: countError } = await supabase
        .from('cart_items')
        .select('id', { count: 'exact' })
        .eq('id', itemId)
        .in('cart_id', supabase.from('carts').select('id').eq('user_id', userId)); // Subquery to check cart ownership

       if (countError) {
            console.error('Error checking item ownership:', countError);
             return new Response(JSON.stringify({ error: 'Failed to verify item ownership' }), {
                 headers: { 'Content-Type': 'application/json' },
                 status: 500,
             });
       }

       if (count === 0) {
           return new Response(JSON.stringify({ error: 'Item not found in user\'s cart' }), {
               headers: { 'Content-Type': 'application/json' },
               status: 404, // Not found in the user's cart
           });
       }


      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId); // RLS should prevent deleting items from other users' carts

      if (error) {
        console.error('Error removing cart item:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ message: 'Item removed successfully' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (error) {
      console.error('Error in DELETE /cart/items/:itemId:', error);
      return new Response(JSON.stringify({ error: 'Failed to remove cart item' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } else {
    // Handle other methods or invalid routes
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }
});