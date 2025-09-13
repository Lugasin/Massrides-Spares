import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/database.types';

// This gives us the exact type for a row in our 'products' table.
// Replace 'products' with your actual table name.
type Product = Database['public']['Tables']['spare_parts']['Row'];

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      // Thanks to the generated types, `from()` will have autocomplete
      // and `select()` will return a typed result.
      const { data, error } = await supabase.from('spare_parts').select('*');

      if (error) {
        console.error('Error fetching products:', error);
      } else if (data) {
        setProducts(data);
      }
      setLoading(false);
    }

    fetchProducts();
  }, []);

  if (loading) {
    return <div>Loading products...</div>;
  }

  if (!products.length) {
    return <div>No products found. Have you created the 'products' table and added data?</div>;
  }

  return (
    <div>
      <h2>Products</h2>
      <ul>{products.map((product) => <li key={product.id}>{product.name}</li>)}</ul>
    </div>
  );
}