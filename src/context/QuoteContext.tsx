import React, { createContext, useState, useContext, ReactNode } from 'react';

interface QuoteItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string; // Added image property
  specs: string[]; // Added specs property
}

interface QuoteContextType {
  items: QuoteItem[];
  total: number;
  addItem: (item: QuoteItem) => void;
  removeItem: (itemId: number) => void;
  updateItemQuantity: (itemId: number, quantity: number) => void;
  clearQuote: () => void;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export const QuoteProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<QuoteItem[]>([]);

  const addItem = (item: QuoteItem) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      } else {
        return [...prevItems, item];
      }
    });
  };

  const removeItem = (itemId: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: number, quantity: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: quantity } : item
      )
    );
  };

  const clearQuote = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <QuoteContext.Provider value={{ items, total, addItem, removeItem, updateItemQuantity, clearQuote }}>
      {children}
    </QuoteContext.Provider>
  );
};

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};