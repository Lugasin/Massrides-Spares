import React from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AboutUsTeaser } from "@/components/AboutUsTeaser";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { useQuote } from "@/context/QuoteContext";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { itemCount } = useQuote();
  const navigate = useNavigate();

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
      
      <BackToTop />
    </div>
  );
};

export default Index;
