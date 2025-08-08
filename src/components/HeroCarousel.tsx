import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import hero images from assets
import tractorPlowing from '@/assets/tractor-plowing.jpg';
import combineHarvester from '@/assets/combine-harvester-working-field.jpg';
import cornFieldSunset from '@/assets/corn-field-sunset.jpg';
import farmerTractor from '@/assets/farmer-tractor.jpg';
import irrigationAerial from '@/assets/irrigation-aerial.jpg';

interface CarouselSlide {
  id: number;
  image: string;
  title: string;
  description: string;
  cta: string;
  link: string;
  type: 'image' | 'video';
}

const slides: CarouselSlide[] = [
  {
    id: 1,
    image: tractorPlowing,
    title: 'Premium Agricultural Spare Parts',
    description: 'Discover our extensive range of engine parts, hydraulic components, and electrical parts for all your agricultural equipment.',
    cta: 'Shop Engine Parts',
    link: '/catalog?category=engine-parts',
    type: 'image'
  },
  {
    id: 2,
    image: combineHarvester,
    title: 'Keep Your Equipment Running',
    description: 'Get genuine and aftermarket spare parts for combines, tractors, and all agricultural machinery.',
    cta: 'Shop Hydraulic Parts',
    link: '/catalog?category=hydraulic-parts',
    type: 'image'
  },
  {
    id: 3,
    image: irrigationAerial,
    title: 'Electrical & Control Parts',
    description: 'Find electrical components, sensors, and control parts for modern agricultural equipment.',
    cta: 'Shop Electrical Parts',
    link: '/catalog?category=electrical-parts',
    type: 'image'
  },
  {
    id: 4,
    image: farmerTractor,
    title: 'Spring Parts Sale',
    description: 'Save up to 25% on selected spare parts. Limited time offer on premium agricultural components.',
    cta: 'View Sale Parts',
    link: '/catalog?sale=spring',
    type: 'image'
  },
  {
    id: 5,
    image: cornFieldSunset,
    title: 'Genuine & Aftermarket Parts',
    description: 'Choose from genuine OEM parts and high-quality aftermarket alternatives from trusted brands.',
    cta: 'Explore Brands',
    link: '/catalog',
    type: 'image'
  }
];

export const HeroCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const navigate = useNavigate();

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleCTAClick = (link: string) => {
    navigate(link);
  };

  return (
    <section className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] min-h-[400px] lg:min-h-[600px] overflow-hidden bg-muted">
      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-105'
            }`}
          >
            {/* Background Image with Parallax Effect */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transform transition-transform duration-[7000ms] ease-out"
              style={{
                backgroundImage: `linear-gradient(
                  135deg, 
                  rgba(46, 125, 50, 0.7) 0%, 
                  rgba(46, 125, 50, 0.4) 50%, 
                  rgba(0, 0, 0, 0.3) 100%
                ), url(${slide.image})`,
                transform: index === currentSlide ? 'scale(1.1)' : 'scale(1)'
              }}
            />
            
            {/* Content Overlay */}
            <div className="relative z-10 h-full flex items-center">
              <div className="container mx-auto px-4 lg:px-8">
                <div className="max-w-2xl">
                  <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-white mb-4 lg:mb-6 transition-all duration-1000 delay-300 ${
                    index === currentSlide 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}>
                    {slide.title}
                  </h1>
                  
                  <p className={`text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-6 lg:mb-8 leading-relaxed transition-all duration-1000 delay-500 ${
                    index === currentSlide 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}>
                    {slide.description}
                  </p>
                  
                  <Button
                    onClick={() => handleCTAClick(slide.link)}
                    className={`bg-primary hover:bg-primary-hover text-white px-6 lg:px-8 py-3 lg:py-4 text-base lg:text-lg font-semibold rounded-lg transition-all duration-1000 delay-700 hover-scale ${
                      index === currentSlide 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-8'
                    }`}
                  >
                    {slide.cta}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-2 lg:p-3 rounded-full transition-all duration-300 hover-scale"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5 lg:h-6 lg:w-6" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-2 lg:p-3 rounded-full transition-all duration-300 hover-scale"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5 lg:h-6 lg:w-6" />
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        className="absolute top-2 lg:top-4 right-2 lg:right-4 z-20 bg-black/30 hover:bg-black/50 text-white p-2 lg:p-3 rounded-full transition-all duration-300 hover-scale"
        aria-label={isPlaying ? 'Pause carousel' : 'Play carousel'}
      >
        {isPlaying ? <Pause className="h-4 w-4 lg:h-5 lg:w-5" /> : <Play className="h-4 w-4 lg:h-5 lg:w-5" />}
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 lg:gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white scale-125' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 z-20">
        <div 
          className={`h-full bg-primary transition-all duration-300 ${
            isPlaying ? 'animate-[progress_5s_linear_infinite]' : ''
          }`}
          style={{
            width: `${((currentSlide + 1) / slides.length) * 100}%`
          }}
        />
      </div>
    </section>
  );
};