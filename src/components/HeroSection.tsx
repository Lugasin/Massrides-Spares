import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Import all images from assets
import heroCombine from "@/assets/hero-combine.jpg";
import tractorPlowing from "@/assets/tractor-plowing.jpg";
import irrigationAerial from "@/assets/irrigation-aerial.jpg";
import image8_8 from "@/assets/8-8.png";
import combineImage from "@/assets/Combine.jpg";
import droneSprayer from "@/assets/Dronesprayer.png";
import harvesterImage from "@/assets/Harverster.jpg";
import harvestersImage from "@/assets/Harversters.jpg.png";
import maizeSprinklers from "@/assets/Maizesprinklers.png";
import newTractor from "@/assets/Newtractor.png";
import newTractor1 from "@/assets/Newtractor1.png";
import newTractor10 from "@/assets/Newtractor10.png";
import newTractor11 from "@/assets/Newtractor11.png";
import newTractor2 from "@/assets/Newtractor2.png";
import newTractor3 from "@/assets/Newtractor3.png";
import newTractor4 from "@/assets/Newtractor4.png";
import newTractor5 from "@/assets/Newtractor5.png";
import newTractor6 from "@/assets/Newtractor6.png";
import newTractor7 from "@/assets/Newtractor7.png";
import newTractor8 from "@/assets/Newtractor8.png";
import newTractor9 from "@/assets/Newtractor9.png";
import newTractorFreight from "@/assets/Newtractorfreight.png";
import newTractors from "@/assets/Newtractors.png";
import newTractors1 from "@/assets/Newtractors1.jpg.png";
import pivot3 from "@/assets/Pivot3.png";
import ploughImage from "@/assets/Plough.png";
import ploughsImage from "@/assets/Ploughs.png";
import rotavatorImage from "@/assets/Rotavator-5-1.png";
import screenshotImage from "@/assets/Screenshot 2025-07-29 131548.png";
import sprinklersImage from "@/assets/Sprinklers.png";
import sprinklers1Image from "@/assets/Sprinklers1.png";
import tractorPloughingImage from "@/assets/Tractorplouging.jpg.png";
import tractorPloughing1Image from "@/assets/Tractorplouging1.png";
import tractorsImage from "@/assets/Tractors.jpg";
import tractors1Image from "@/assets/Tractors1.jpg.png";
import tractorsDiscImage from "@/assets/Tractorsdisc.jpg";
import tractorsSprayingImage from "@/assets/Tractorsspraying.jpg.png";
import seederCloseUp from "@/assets/close-up-seeder-attached-tractor-field.jpg";
import combineHarvesterWorking from "@/assets/combine-harvester-working-field.jpg";
import cornFieldSunset from "@/assets/corn-field-sunset.jpg";
import discHarrow from "@/assets/disc-harrow-76-1696055574.png";
import discHarrow1 from "@/assets/disc-harrow-76-1711433455.png";
import discMounted from "@/assets/disc-mounted-47004.png";
import hydraulicHarrow from "@/assets/hydraulic-harrow-76-1608289508.png";
import largeRiceField from "@/assets/large-green-rice-field-with-green-rice-plants-rows.jpg";
import matTillage from "@/assets/mat-multi-application-tillage-unit-76-1673517805.png";
import matTillageWebp from "@/assets/mat-multi-application-tillage-unit-76-1673517805.webp";
import newRedSeeder from "@/assets/new-red-agricultural-seeder-close-up-view-background-combine.jpg";
import newTractorsImage from "@/assets/newTractors.jpg.png";
import pivotImage from "@/assets/pivot.png";
import pivot1Image from "@/assets/pivot1.png";
import pivot2Image from "@/assets/pivot2.png";
import pivotsImage from "@/assets/pivots.png";
import planterSeedingImage from "@/assets/planter-seeding.jpg";
import polyDiscHarrow from "@/assets/poly-disc-harrow-plough-76-1673336488..png";
import ripeWheatCutting from "@/assets/ripe-wheat-cutting-with-heavy-machinery-outdoors-generated-by-ai.jpg";
import seed1 from "@/assets/seed-1.png";
import tandemDiscHarrow from "@/assets/tandem-disc-harrow-heavy-series-76-1673002303.png";
import topViewTractors from "@/assets/top-view-tractors-doing-harvest-field.jpg";
import tractorWheel from "@/assets/tractor-wheel.jpg";
import tractorWorkingField from "@/assets/tractor-working-green-field.jpg";
import truckWorkingField from "@/assets/truck-working-field-sunny-day.jpg";

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
  },
  {
    id: 4,
    image: combineHarvesterWorking,
    title: "Maximize Your Harvest",
    subtitle: "High-Performance Combines",
    description: "Cut through your fields with our top-of-the-line combine harvesters.",
    cta: "Browse Combines",
    ctaSecondary: "Request a Demo"
  },
  {
    id: 5,
    image: cornFieldSunset,
    title: "Beautiful Fields, Bountiful Yields",
    subtitle: "Planting for the Future",
    description: "Our equipment helps you cultivate the land for maximum productivity.",
    cta: "Discover Planters",
    ctaSecondary: "Learn Planting Tips"
  },
  {
    id: 6,
    image: ripeWheatCutting,
    title: "Efficient Harvesting",
    subtitle: "Advanced Machinery for Grain",
    description: "Harvest your grain crops quickly and efficiently with our heavy machinery.",
    cta: "View Harvesters",
    ctaSecondary: "Compare Models"
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
            {/* Background Image with Enhanced Parallax */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-parallax parallax-slow"
              style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${slide.image})`,
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
      <div className="absolute bottom-8 right-8 text-white/90 animate-fade-in-out">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-wider">Scroll</span>
          <div className="w-px h-8 bg-white/70" />
        </div>
      </div>
    </section>
  );
};