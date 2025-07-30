import React, { useEffect, useRef } from 'react';

const WhyChooseUsSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null); // Ref for the section

  // Parallax effect for background layers
  useEffect(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const sectionOffsetTop = sectionElement.offsetTop;
      const sectionHeight = sectionElement.offsetHeight;
      const viewportHeight = window.innerHeight;

      // Calculate scroll position relative to the section
      const scrollPercentage = Math.max(0, Math.min(1, (scrollTop - sectionOffsetTop + viewportHeight) / (viewportHeight + sectionHeight)));

      const backgroundLayer = sectionElement.querySelector('.parallax-background-layer') as HTMLElement;
      const foregroundLayer = sectionElement.querySelector('.parallax-foreground-layer') as HTMLElement;

      if (backgroundLayer) {
        // Adjust multiplier for desired speed (slower movement)
        backgroundLayer.style.transform = `translateY(${scrollPercentage * 100}px)`;
      }
       if (foregroundLayer) {
        // Adjust multiplier for desired speed (faster movement)
        foregroundLayer.style.transform = `translateY(${scrollPercentage * 50}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Call on mount to set initial position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  return (
    <section className="why-choose-us-section" ref={sectionRef}>
      {/* Parallax Background Layers */}
      <div className="parallax-background-layers">
        <div className="parallax-background-layer" style={{ backgroundImage: 'url(/src/assets/corn-field-sunset.jpg)' }}></div> {/* Placeholder background image */}
        <div className="parallax-foreground-layer" style={{ backgroundImage: 'url(/src/assets/clouds.png)' }}></div> {/* Placeholder foreground image (e.g., clouds) */}
      </div>

      <div className="container"> {/* Use a container for content */}
        <h2 className="section-title">Why Choose Us?</h2>
        <div className="content">
          {/* Add your reasons/text here */}
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          {/* Add more content as needed */}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;