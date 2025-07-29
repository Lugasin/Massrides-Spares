import React, { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AboutUsTeaser } from "@/components/AboutUsTeaser";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { BackToTop } from "@/components/BackToTop";
import { ImageSwitchingCards } from "@/components/ImageSwitchingCards"; // Import the new component

// Import images to pass to the new component (example)
import combineImage from "@/assets/Combine.jpg";
import newTractor1 from "@/assets/Newtractor1.png";
import pivotImage from "@/assets/pivot.png";
import seed1 from "@/assets/seed-1.png";
import tractorWorkingField from "@/assets/tractor-working-green-field.jpg";
import truckWorkingField from "@/assets/truck-working-field-sunny-day.jpg";

const Index = () => {
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Demo cart items
  const [cartItems, setCartItems] = useState([
    // ... your existing cart items ...
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

  // Example images to pass to ImageSwitchingCards
  const showcaseImages = [
    combineImage,
    newTractor1,
    pivotImage,
    seed1,
    tractorWorkingField,
    truckWorkingField,
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItemsCount={cartItemsCount}
        onCartClick={handleCartClick}
        onAuthClick={handleAuthClick}
      />
      
      <main>
        <HeroSection />
        {/* Add the new ImageSwitchingCards component */}
        <ImageSwitchingCards images={showcaseImages} />
        <AboutUsTeaser />
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
      
      <BackToTop />
    </div>
  );
};

export default Index;
