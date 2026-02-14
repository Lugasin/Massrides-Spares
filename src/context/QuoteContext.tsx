import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  id: string; // Database Row ID (UUID) of the cart_item, NOT the product_id
  product_id: string; // Product ID (for uniqueness check)
  name: string;
  price: number;
  quantity: number;
  image: string;
  specs: string[];
  category: string;
}

interface QuoteContextType {
  items: CartItem[];
  total: number;
  addItem: (item: Omit<CartItem, 'quantity' | 'id'>) => Promise<void>; // Modified signature
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  loading: boolean;
}

export const QuoteContext = createContext<QuoteContextType>({
  items: [],
  total: 0,
  addItem: async () => { },
  removeItem: async () => { },
  updateQuantity: async () => { },
  clearCart: async () => { },
  itemCount: 0,
  isCartOpen: false,
  openCart: () => { },
  closeCart: () => { },
  loading: false,
});

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};

interface QuoteProviderProps {
  children: ReactNode;
}

export const QuoteProvider: React.FC<QuoteProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    try {
      setLoading(true);
      const { getCartItems } = await import('@/lib/supabase');
      const savedItems = await getCartItems();

      const ContextItems: CartItem[] = savedItems.map((i: any) => ({
        id: i.id, // This is the Cart Item UUID
        product_id: String(i.product_id), // Ensure string
        name: i.product?.name || 'Unknown Part',
        price: Number(i.product?.price) || 0,
        quantity: i.quantity,
        image: i.product?.main_image || '',
        specs: [], // Can populate from attributes if needed
        category: 'Spare Parts'
      }));
      setItems(ContextItems);
    } catch (error) {
      console.error("Failed to load cart", error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial state
  React.useEffect(() => {
    loadCart();
  }, []);

  const addItem = async (item: Omit<CartItem, 'quantity' | 'id'>) => {
    // The incoming 'item' only has product info (price, name, etc) but NO ID yet.
    // 'item.product_id' is expected to be passed if the caller follows the type,
    // or sometimes 'item.id' was used as product_id in old code.

    // We assume the caller passes { product_id: "...", name: "...", ... }
    const productId = item.product_id;

    try {
      const { addToCart } = await import('@/lib/supabase');
      await addToCart(productId, 1);
      await loadCart(); // Refresh to get the real UUID
      setIsCartOpen(true);
    } catch (error) {
      console.error("Failed to sync add item", error);
    }
  };

  const removeItem = async (id: string) => {
    // Optimistic
    setItems(prev => prev.filter(item => item.id !== id));

    // Sync with DB
    try {
      const { removeFromCart } = await import('@/lib/supabase');
      await removeFromCart(id); // ID is Cart Item UUID
      await loadCart();
    } catch (error) {
      console.error("Failed to sync remove item", error);
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      return removeItem(id);
    }

    // Optimistic
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );

    // Sync
    try {
      const { updateCartItemQuantity } = await import('@/lib/supabase');
      await updateCartItemQuantity(id, quantity); // ID is Cart Item UUID
    } catch (error) {
      console.error("Failed to sync update quantity", error);
    }
  };

  const clearCart = async () => {
    setItems([]);

    try {
      const { clearCart } = await import('@/lib/supabase');
      await clearCart();
      await loadCart();
    } catch (error) {
      console.error("Failed to sync clear cart", error);
    }
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <QuoteContext.Provider value={{
      items,
      total,
      addItem: addItem as any, // Type assertion for compatibility if strict checks fail
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      isCartOpen,
      openCart,
      closeCart,
      loading
    }}>
      {children}
    </QuoteContext.Provider>
  );
};
