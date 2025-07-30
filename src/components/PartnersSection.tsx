import React, { useEffect, useRef } from 'react';

interface PartnerLogo {
  id: number;
  logo: string; // Path to the logo image
  name: string; // Partner name for alt text
}

interface Testimonial {
    quote: string;
    author: string;
    headshot: string; // Path to the farmer's headshot
}

const partnerLogos: PartnerLogo[] = [
  { id: 1, logo: '/src/assets/john-deere-logo.png', name: 'John Deere' }, // Placeholder logo paths
  { id: 2, logo: '/src/assets/kubota-logo.png', name: 'Kubota' },
  { id: 3, logo: '/src/assets/agco-logo.png', name: 'AGCO' },
  { id: 4, logo: '/src/assets/new-holland-logo.png', name: 'New Holland' },
  // Add more partner logos as needed
];

const customerTestimonial: Testimonial = {
    quote: "Massrides equipment transformed my farm's productivity!",
    author: "Moses Phiri, Farmer",
    headshot: '/src/assets/farmer-headshot.jpg', // Placeholder headshot path
};

const PartnersSection: React.FC = () => {
    const partnersRef = useRef<HTMLDivElement>(null);
    const testimonialRef = useRef<HTMLDivElement>(null); // Ref for the testimonial element


     // Refined implementation of auto-scrolling for logos
    useEffect(() => {
        const partnersElement = partnersRef.current;
        if (!partnersElement) return;

        let animationFrameId: number;
        let scrollSpeed = 0.5; // Adjust scroll speed

        const scrollLogos = () => {
            // Check if we've scrolled halfway (the point where the first set of logos ends)
            if (partnersElement.scrollLeft >= partnersElement.scrollWidth / 2) {
                // Reset scroll position to the beginning of the duplicated set
                partnersElement.scrollLeft = 0;
            } else {
                partnersElement.scrollLeft += scrollSpeed;
            }
             animationFrameId = requestAnimationFrame(scrollLogos);
        };

        // Pause on hover
        const pauseScroll = () => {
             cancelAnimationFrame(animationFrameId);
        };

         const startScroll = () => {
            scrollLogos();
         };

        partnersElement.addEventListener('mouseenter', pauseScroll);
        partnersElement.addEventListener('mouseleave', startScroll);


        scrollLogos(); // Start scrolling on mount

        return () => {
            cancelAnimationFrame(animationFrameId);
             partnersElement.removeEventListener('mouseenter', pauseScroll);
             partnersElement.removeEventListener('mouseleave', startScroll);
        };
    }, []); // Dependency array remains the same


    // Refined Parallax effect for testimonial
    useEffect(() => {
        const testimonialElement = testimonialRef.current;
        if (!testimonialElement) return;

        const handleScroll = () => {
            // Get the element's position in the viewport
            const rect = testimonialElement.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Calculate how much of the element is visible
            const elementVisibility = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (viewportHeight + rect.height)));

            // Apply a subtle transform based on visibility
            // Adjust the multiplier (e.g., -50) for desired parallax strength and direction
            testimonialElement.style.transform = `translateY(${elementVisibility * -50}px)`;
        };

        window.addEventListener('scroll', handleScroll);
        // Also call on mount to set initial position
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []); // Empty dependency array as it only needs to run once on mount


  return (
    <section className="partners-testimonials-section">
      <div className="container">
        {/* Partner Logos Strip */}
        <div className="partner-logos-container" ref={partnersRef}>
           <div className="partner-logos-strip">
                {/* Duplicate logos for seamless scrolling */}
                {partnerLogos.concat(partnerLogos).map(partner => (
                    <div key={`${partner.id}-${Math.random()}`} className="partner-logo"> {/* Use random key for duplicates */}
                        <img src={partner.logo} alt={partner.name} />
                    </div>
                ))}
           </div>
        </div>

        {/* Customer Highlight */}
        <div className="customer-highlight" ref={testimonialRef}> {/* Add ref to the testimonial element */}
            <div className="customer-headshot">
                <img src={customerTestimonial.headshot} alt={customerTestimonial.author} />
            </div>
            <div className="customer-quote">
                <p>"{customerTestimonial.quote}"</p>
                <p>- {customerTestimonial.author}</p>
            </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;