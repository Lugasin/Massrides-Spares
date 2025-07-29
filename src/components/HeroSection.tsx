import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; // Assuming you use react-router-dom for navigation

const heroSlides = [
  {
    image: '/src/assets/Newtractors.png', // Placeholder path, replace with your actual image
    placeholder: '/src/assets/placeholder.svg', // Placeholder image
    title: 'Advanced Tractor Model 1',
    blurb: 'Experience power and efficiency with our latest model.',
    ctaLink: '/catalog/tractor-1',
    // Add parallax layers data (example)
    parallaxLayers: {
        background: '/src/assets/corn-field-sunset.jpg', // Background field image
        midground: '/src/assets/Newtractors.png', // Mid-ground machinery image
        foreground: '/src/assets/dust-effect.png', // Foreground dust/smoke effect image
    }
  },
  {
    image: '/src/assets/Newtractor1.png', // Placeholder path
    placeholder: '/src/assets/placeholder.svg',
    title: 'Advanced Tractor Model 2',
    blurb: 'Maximize your yield with our high-performance harvesters.',
    ctaLink: '/catalog/harvester-y',
     parallaxLayers: {
        background: '/src/assets/large-green-rice-field-with-green-rice-plants-rows.jpg',
        midground: '/src/assets/combine-harvester-working-field.jpg',
        foreground: '/src/assets/smoke-effect.png',
    }
  },
  {
    image: '/src/assets/Newtractor2.png', // Placeholder path
    placeholder: '/src/assets/placeholder.svg',
    title: 'Advanced Tractor Model 3',
    blurb: 'Boost productivity with our versatile equipment.',
    ctaLink: '/catalog/tractor-3',
     parallaxLayers: {
        background: '/src/assets/corn-field-sunset.jpg',
        midground: '/src/assets/Newtractor2.png',
        foreground: '/src/assets/dust-effect.png',
    }
  },
  {
    image: '/src/assets/Newtractor3.png', // Placeholder path
    placeholder: '/src/assets/placeholder.svg',
    title: 'Advanced Tractor Model 4',
    blurb: 'Innovative solutions for modern agriculture.',
    ctaLink: '/catalog/tractor-4',
     parallaxLayers: {
        background: '/src/assets/large-green-rice-field-with-green-rice-plants-rows.jpg',
        midground: '/src/assets/Newtractor3.png',
        foreground: '/src/assets/smoke-effect.png',
    }
  },
  {
    image: '/src/assets/Newtractor4.png', // Placeholder path
    placeholder: '/src/assets/placeholder.svg',
    title: 'Advanced Tractor Model 5',
    blurb: 'Reliable machinery for demanding tasks.',
    ctaLink: '/catalog/tractor-5',
     parallaxLayers: {
        background: '/src/assets/corn-field-sunset.jpg',
        midground: '/src/assets/Newtractor4.png',
        foreground: '/src/assets/dust-effect.png',
    }
  },
  {
    image: '/src/assets/Newtractor5.png', // Placeholder path
    placeholder: '/src/assets/placeholder.svg',
    title: 'Advanced Tractor Model 6',
    blurb: 'Optimized performance for every field.',
    ctaLink: '/catalog/tractor-6',
     parallaxLayers: {
        background: '/src/assets/large-green-rice-field-with-green-rice-plants-rows.jpg',
        midground: '/src/assets/Newtractor5.png',
        foreground: '/src/assets/smoke-effect.png',
    }
  },
];

const HeroSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef<number | null>(null);
   const heroSectionRef = useRef<HTMLElement>(null); // Ref for hero section for parallax

  const totalSlides = heroSlides.length;

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(nextSlide, 5000); // Auto-rotate every 5 seconds
    } else {
      clearInterval(intervalRef.current || undefined);
    };

    return () => {
      clearInterval(intervalRef.current || undefined);
    };
  }, [isPlaying, totalSlides]);

  // Basic Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('.lazy-image').forEach(img => {
      observer.observe(img);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

    // Parallax Effect
  useEffect(() => {
    const handleScroll = () => {
      if (heroSectionRef.current) {
        const scrollTop = window.scrollY;
        const heroOffsetTop = heroSectionRef.current.offsetTop;
        const heroHeight = heroSectionRef.current.offsetHeight;

        // Calculate scroll position relative to the hero section
        const scrollPercentage = (scrollTop - heroOffsetTop) / heroHeight;

        // Apply parallax transform to layers
        const background = heroSectionRef.current.querySelector('.parallax-background') as HTMLElement;
        const midground = heroSectionRef.current.querySelector('.parallax-midground') as HTMLElement;
        const foreground = heroSectionRef.current.querySelector('.parallax-foreground') as HTMLElement;

        if (background) {
          background.style.transform = `translateY(${scrollPercentage * 50}px)`; // Adjust multiplier for desired speed
        }
        if (midground) {
          midground.style.transform = `translateY(${scrollPercentage * 30}px)`; // Adjust multiplier
        }
         if (foreground) {
          foreground.style.transform = `translateY(${scrollPercentage * 10}px)`; // Adjust multiplier
        }
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  return (
    <section ref={heroSectionRef} className="hero-section" aria-roledescription="carousel">
      <div className="carousel-container" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
            role="group"
            aria-label={`Slide ${index + 1} of ${totalSlides}`}
          >
             {/* Parallax Layers */}
            {slide.parallaxLayers && (
                <div className="parallax-layers">
                    <div className="parallax-background" style={{ backgroundImage: `url(${slide.parallaxLayers.background})` }}></div>
                    <img className="parallax-midground" src={slide.parallaxLayers.midground} alt="Midground" />
                    <img className="parallax-foreground" src={slide.parallaxLayers.foreground} alt="Foreground" />
                </div>
            )}


            <img
              src={slide.placeholder} // Use placeholder initially
              data-src={slide.image} // Store actual image path in data-src
              alt={slide.title}
              className="lazy-image" // Add a class for easier selection
            />
            <div className="slide-content">
              <h2>{slide.title}</h2>
              <p>{slide.blurb}</p>
              <Link to={slide.ctaLink}>Learn More</Link>
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Navigation */}
      <div className="carousel-navigation">
        <button aria-label="Previous slide" onClick={prevSlide}>&lt;</button>
        <button aria-label="Next slide" onClick={nextSlide}>&gt;</button>
      </div>

      {/* Carousel Indicators */}
      <div className="carousel-indicators">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            aria-label={`Go to slide ${index + 1}`}
            className={index === currentIndex ? 'active' : ''}
            onClick={() => goToSlide(index)}
          ></button>
        ))}
      </div>

      {/* Pause/Play Button */}
      <button aria-label={isPlaying ? "Pause auto-rotation" : "Start auto-rotation"} onClick={togglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </section>
  );
};

export default HeroSection;