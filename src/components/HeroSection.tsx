import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import heroCombine from "@/assets/hero-combine.jpg";
import tractorPlowing from "@/assets/tractor-plowing.jpg";
import irrigationAerial from "@/assets/irrigation-aerial.jpg";

const slides = [
  {
    id: 1,
    image: heroCombine,
    title: "Premium Agriculture Equipment",
    subtitle: "Harvesting Excellence",
    description: "Discover our range of professional combine harvesters designed for maximum efficiency and yield.",
    cta: "Shop Harvesters",
    ctaSecondary: "Learn More"
  },
  {
    id: 2,
    image: tractorPlowing,
    title: "Powerful Tractors & Implements",
    subtitle: "Built for Performance",
    description: "Advanced tractors and plowing equipment engineered for modern farming operations.",
    cta: "Explore Tractors",
    ctaSecondary: "View Catalog"
  },
  {
    id: 3,
    image: irrigationAerial,
    title: "Smart Irrigation Solutions",
    subtitle: "Water. Efficiently.",
    description: "State-of-the-art irrigation systems to optimize water usage and crop production.",
    cta: "Irrigation Systems",
    ctaSecondary: "Get Quote"
  }
];

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  return (
    <section className="relative min-h-[80vh] lg:min-h-[90vh] overflow-hidden">
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-all duration-1000 ease-in-out",
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
            )}
          >
            {/* Background Image with Parallax Effect */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-parallax"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.3)), url(${slide.image})`,
              }}
            />

            {/* Content Overlay */}
            <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
              <div className="max-w-2xl text-white">
                <div className={cn(
                  "transition-all duration-1000 delay-300",
                  index === currentSlide ? "animate-fade-in" : "opacity-0 translate-y-8"
                )}>
                  <span className="inline-block bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
                    {slide.subtitle}
                  </span>
                  
                  <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                    {slide.title}
                  </h1>
                  
                  <p className="text-lg lg:text-xl mb-8 opacity-90 leading-relaxed">
                    {slide.description}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      size="lg" 
                      className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-primary group"
                    >
                      {slide.cta}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-white/50 text-white hover:bg-white/10 backdrop-blur-sm"
                    >
                      {slide.ctaSecondary}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      <div className="absolute inset-y-0 left-4 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          className="bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 rounded-full"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="absolute inset-y-0 right-4 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          className="bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 rounded-full"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              index === currentSlide 
                ? "bg-primary scale-125" 
                : "bg-white/50 hover:bg-white/75"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 right-8 text-white/70 animate-bounce">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-wider">Scroll</span>
          <div className="w-px h-8 bg-white/50" />
        </div>
      </div>
    </section>
  );
};