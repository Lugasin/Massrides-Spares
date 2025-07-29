import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PageLoader from './components/PageLoader'; // Import PageLoader
import Index from './pages/Index';
import AboutUsPage from './pages/AboutUs';
import CatalogPage from './pages/Catalog';
import PartnersPage from './pages/Partners';
import ContactPage from './pages/Contact';
import NotFoundPage from './pages/NotFound';

import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Basic example of setting loading to false after a delay
  // In a real app, you would set this based on actual resource loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Adjust delay as needed (simulating loading time)

    return () => clearTimeout(timer);
  }, []);


  return (
    <Router>
      <div className="App">
        <PageLoader isLoading={isLoading} /> {/* Include PageLoader */}
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        {/* You might have a Footer component here */}      
      </div>
    </Router>
  );
}

export default App;