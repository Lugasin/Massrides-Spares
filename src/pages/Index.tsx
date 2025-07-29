import React, { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import tractorPlowing from "@/assets/tractor-plowing.jpg";
import planterSeeding from "@/assets/planter-seeding.jpg";

const Index = () => {
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Demo cart items
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "John Deere 6M Series Tractor",
      price: 85000,
      quantity: 1,
      image: tractorPlowing,
      specs: ["120 HP", "4WD", "PTO"]
    },
    {
      id: 2,
      name: "Precision Seed Planter Pro", 
      price: 45000,
      quantity: 2,
      image: planterSeeding,
      specs: ["12 Row", "GPS Ready"]
    }
  ]);

  const handleCartClick = () => {
    setIsCartOpen(true);
  };

  const handleAuthClick = () => {
    // TODO: Implement authentication  
    console.log("Auth clicked");
  };

  const handleUpdateQuantity = (id: number, quantity: number) => {
    if (quantity === 0) {
      handleRemoveItem(id);
      return;
    }
    setCartItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (id: number) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    // TODO: Implement checkout
    console.log("Proceeding to checkout...");
    setIsCartOpen(false);
  };

  // Update cart items count when items change
  React.useEffect(() => {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    setCartItemsCount(totalItems);
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItemsCount={cartItemsCount}
        onCartClick={handleCartClick}
        onAuthClick={handleAuthClick}
      />
      
      <main>
        <HeroSection />
        <FeaturesSection />
        <ProductShowcase />
        <ContactSection />
      </main>
      
      <Footer />
      
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default Index;
