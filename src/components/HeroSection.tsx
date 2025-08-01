import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import heroCombine from "@/assets/hero-combine.jpg";
import tractorPlowing from "@/assets/tractor-plowing.jpg";
import irrigationAerial from "@/assets/irrigation-aerial.jpg";
import { useNavigate } from "react-router-dom"; // Import useNavigate

// Define slide data structure with type and src
interface Slide {
  id: number;
  type: 'image' | 'video'; // Add type property
  src: string; // Use src for both image and video paths
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  ctaLink: string;
  ctaSecondary?: string;
  ctaSecondaryLink?: string;
}

const slides: Slide[] = [
  {
    id: 1,
    type: 'image', // Specify type as image
    src: heroCombine,
    title: "Premium Agriculture Equipment",
    subtitle: "Harvesting Excellence",
    description: "Discover our range of professional combine harvesters designed for maximum efficiency and yield.",
    cta: "Shop Now",
    ctaLink: "/catalog",
    ctaSecondary: "Learn More",
    ctaSecondaryLink: "/#about"
  },
  {
    id: 2,
    type: 'image', // Specify type as image
    src: tractorPlowing,
    title: "Powerful Tractors & Implements",
    subtitle: "Built for Performance",
    description: "Advanced tractors and plowing equipment engineered for modern farming operations.",
    cta: "Shop Now",
    ctaLink: "/catalog",
    ctaSecondary: "View Catalog",
    ctaSecondaryLink: "/catalog"
  },
  {
    id: 3,
    type: 'image', // Specify type as image
    src: irrigationAerial,
    title: "Smart Irrigation Solutions",
    subtitle: "Water. Efficiently.",
    description: "State-of-the-art irrigation systems to optimize water usage and crop production.",
    cta: "Shop Now",
    ctaLink: "/catalog",
    ctaSecondary: "Get Quote",
    ctaSecondaryLink: "/#contact"
  },
  // Add example video slide - Replace with your video file later
  {
    id: 4,
    type: 'video', // Specify type as video
    src: "/path/to/your/video.mp4", // Replace with actual video path
    title: "See Our Equipment in Action",
    subtitle: "Dynamic Demonstrations",
    description: "Watch videos of our machinery performing in real-world agricultural settings.",
    cta: "View Videos", // Example CTA for video slide
    ctaLink: "/#videos", // Example link for video slide
    ctaSecondary: "Learn More", // Example secondary CTA
    ctaSecondaryLink: "/#features" // Example secondary link
  }
];

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const navigate = useNavigate();

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

  // Handle CTA button clicks
  const handleCtaClick = (link: string) => {
    if (link.startsWith('/#')) {
      // Handle hash links for scrolling
      document.getElementById(link.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Handle route navigation
      navigate(link);
    }
  };

  return (
    <section className="relative min-h-[90vh] lg:min-h-[100vh] overflow-hidden">
      {/* Animated "watered crops" background layer */}
      <div className="absolute inset-0 animate-crops-water opacity-30">
        <div className="absolute inset-0 gradient-crops"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-primary/10"></div>
      </div>

      {/* Parallax equipment silhouettes layer */}
      <div className="absolute inset-0 parallax-slow opacity-20">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-white/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-20 h-20 bg-white/10 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

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
            {/* Background Media (Image or Video) */}
            {slide.type === 'image' ? (
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-parallax parallax-slow"
                style={{
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${slide.src})`,
                }}
              />
            ) : (
              <video 
                className="absolute inset-0 w-full h-full object-cover"
                src={slide.src}
                autoPlay
                loop
                muted
                playsInline
              />
            )}

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
                      onClick={() => slide.ctaLink && navigate(slide.ctaLink)} 
                    >
                      {slide.cta}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                    {slide.ctaSecondary && slide.ctaSecondaryLink && (
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="border-white/50 text-white hover:bg-white/10 backdrop-blur-sm"
                        onClick={() => handleCtaClick(slide.ctaSecondaryLink)}
                      >
                        {slide.ctaSecondary}
                      </Button>
                    )}
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
      <div className="absolute bottom-8 right-8 text-white/90 animate-fade-in-out">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-wider">Scroll</span>
          <div className="w-px h-8 bg-white/70" />
        </div>
      </div>
    </section>
  );
};

// Note: For global lazy loading, wrap <img> tags with loading="lazy", and implement a separate <Loader> component with a rotating tractor wheel and smoke animations for full-page loads.
