import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  id: string; // Database Row ID (UUID)
  product_id?: string; // Product ID (for uniqueness check)
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
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  isCartOpen: boolean; // Added isCartOpen
  openCart: () => void; // Added openCart
  closeCart: () => void; // Added closeCart
  loading: boolean;
}

export const QuoteContext = createContext<QuoteContextType>({
  items: [],
  total: 0,
  addItem: () => { },
  removeItem: () => { },
  updateQuantity: () => { },
  clearCart: () => { },
  itemCount: 0,
  isCartOpen: false, // Default value
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
      const savedItems = await import('@/lib/supabase').then(m => m.getCartItems());
      const ContextItems = savedItems.map((i: any) => ({
        id: i.id, // Correctly use the Row UUID for deletions/updates
        product_id: i.spare_part_id || i.product_id, // Store Product ID for lookups
        name: i.spare_part?.name || 'Unknown Part',
        price: i.spare_part?.price || 0,
        quantity: i.quantity,
        image: i.spare_part?.images?.[0] || '',
        specs: [],
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

  const addItem = async (item: Omit<CartItem, 'quantity'>) => {
    // The incoming 'item.id' is typically the Product ID from the UI/Catalog
    const incomingProductId = item.id;

    // Optimistic update
    setItems(prev => {
      // Check if we already have this product using product_id (preferred) or id fallback
      const existingItem = prev.find(i =>
        (i.product_id && i.product_id === incomingProductId) ||
        i.id === incomingProductId
      );

      if (existingItem) {
        return prev.map(i =>
          // match by Row ID if we found it, or fallback to checking product_id again
          (i.id === existingItem.id)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      // For new optimistic items, we temporarily use Product ID as 'id' until reload
      return [...prev, { ...item, id: incomingProductId, product_id: incomingProductId, quantity: 1 }];
    });

    // Sync with DB
    try {
      const { addToCart } = await import('@/lib/supabase');
      // Pass the Product ID to addToCart
      await addToCart(incomingProductId, 1);
      // Reload to replace the temporary optimistic item with the real DB row (UUID)
      await loadCart();
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
      // 'id' is now the proper Row UUID (from loadCart), so this delete works!
      await removeFromCart(id);
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
      await updateCartItemQuantity(id, quantity);
    } catch (error) {
      console.error("Failed to sync update quantity", error);
    }
  };

  const clearCart = async () => {
    setItems([]);

    try {
      const { clearCart } = await import('@/lib/supabase');
      await clearCart();
      await loadCart(); // Ensure state is synced
    } catch (error) {
      console.error("Failed to sync clear cart", error);
    }
  };

  const openCart = () => setIsCartOpen(true); // Added openCart function
  const closeCart = () => setIsCartOpen(false); // Added closeCart function

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <QuoteContext.Provider value={{
      items,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      isCartOpen, // Provided to context
      openCart, // Provided to context
      closeCart, // Provided to context
      loading // Expose loading
    }}>
      {children}
    </QuoteContext.Provider>
  );
};
