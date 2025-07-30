import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QuoteProvider } from './context/QuoteContext';
import { Header } from './components/Header';
import { CartDrawer } from './components/CartDrawer';
import { BackToTop } from './components/BackToTop';
import PageLoader from './components/PageLoader';
import Index from './pages/Index';
import AboutUsPage from './pages/AboutUs';
import CatalogPage from './pages/Catalog';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import PartnersPage from './pages/Partners';
import ContactPage from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NotFoundPage from './pages/NotFound';
import { Toaster } from "@/components/ui/sonner";

import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QuoteProvider>
      <Router>
        <div className="App">
          <PageLoader isLoading={isLoading} />
          <Header 
            onCartClick={() => setIsCartOpen(true)}
            onAuthClick={() => {/* Handle auth */}}
          />
          <main className="content">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <CartDrawer 
            isOpen={isCartOpen} 
            onClose={() => setIsCartOpen(false)} 
          />
          <BackToTop />
          <Toaster />
        </div>
      </Router>
    </QuoteProvider>
  );
}

export default App;