import { useEffect, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ParallaxSectionProps {
  children: ReactNode;
  backgroundImage?: string;
  speed?: number; // Speed multiplier for parallax effect (0.5 = half speed, 1 = normal speed)
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

export const ParallaxSection = ({
  children,
  backgroundImage,
  speed = 0.5,
  className,
  overlay = true,
  overlayOpacity = 0.3
}: ParallaxSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !backgroundRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const scrolled = window.pageYOffset;
      const parallax = scrolled * speed;

      // Apply parallax transform only when section is in viewport
      if (rect.bottom >= 0 && rect.top <= window.innerHeight) {
        backgroundRef.current.style.transform = `translate3d(0, ${parallax}px, 0)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <section
      ref={sectionRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Parallax Background */}
      {backgroundImage && (
        <div
          ref={backgroundRef}
          className="absolute inset-0 w-full h-[120%] bg-cover bg-center bg-no-repeat will-change-transform"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            top: '-10%' // Start slightly above to prevent gaps during parallax
          }}
        />
      )}

      {/* Overlay */}
      {overlay && backgroundImage && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
};