import React from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AboutUsTeaser } from "@/components/AboutUsTeaser";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { BackToTop } from "@/components/BackToTop";
import { useQuote } from "@/context/QuoteContext";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { items, itemCount, updateQuantity, removeItem } = useQuote();
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleCartClick = () => {
    setIsCartOpen(true);
  };

  const handleAuthClick = () => {
    navigate('/login');
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItemsCount={itemCount}
        onCartClick={handleCartClick}
        onAuthClick={handleAuthClick}
      />
      
      <main>
        <HeroSection />
        <AboutUsTeaser />
        <FeaturesSection />
        <ProductShowcase />
        <ContactSection />
      </main>
      
      <Footer />
      
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={items}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={handleCheckout}
      />
      
      <BackToTop />
    </div>
  );
};

export default Index;
