import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ParallaxHero = () => {
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative h-screen overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Parallax Background Layers */}
      <div className="absolute inset-0">
        {/* Sky Layer */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-blue-900 via-blue-800 to-green-900"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        />
        
        {/* Field Layer */}
        <div 
          className="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-green-600 to-green-700"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
        
        {/* Equipment Silhouettes */}
        <div 
          className="absolute bottom-0 w-full h-1/2 opacity-20"
          style={{ transform: `translateY(${scrollY * 0.2}px)` }}
        >
          <div className="absolute bottom-0 left-1/4 w-32 h-16 bg-black/30 rounded-lg transform -rotate-12"></div>
          <div className="absolute bottom-4 right-1/3 w-24 h-12 bg-black/30 rounded-lg transform rotate-6"></div>
        </div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full text-white text-center px-4">
        <div className="max-w-4xl">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-fade-in">
            Revolutionary{' '}
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Agri-Equipment
            </span>
          </h1>
          
          <p className="text-xl lg:text-2xl mb-8 opacity-90 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Transform your farming with cutting-edge machinery and smart technology
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Button 
              size="lg" 
              onClick={() => navigate('/catalog')}
              className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
            >
              Browse Catalog
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => document.getElementById('featured-products')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/50 text-white hover:bg-white/10 backdrop-blur-sm"
            >
              Explore Features
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
        <div className="flex flex-col items-center">
          <span className="text-sm mb-2">Scroll to explore</span>
          <ChevronDown className="h-6 w-6" />
        </div>
      </div>
    </section>
  );
};