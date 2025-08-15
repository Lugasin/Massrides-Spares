import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Partner {
  id: string;
  name: string;
  logo_url?: string;
  website_url?: string;
}

interface AutoScrollPartnersProps {
  partners: Partner[];
  className?: string;
}

export const AutoScrollPartners: React.FC<AutoScrollPartnersProps> = ({ 
  partners, 
  className 
}) => {


  // Duplicate partners for seamless infinite scroll
  const partnersToUse = partners;
  const duplicatedPartners = [...partnersToUse, ...partnersToUse, ...partnersToUse];

  return (
    <section className={cn("py-12 bg-muted/30 overflow-hidden", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Trusted Partners
          </h3>
          <p className="text-muted-foreground">
            Working with the world's leading agricultural equipment manufacturers
          </p>
        </div>
        
        {/* Scrolling Ribbon */}
        <div className="relative">
          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          <div className="flex animate-[scroll_30s_linear_infinite] space-x-8 hover:[animation-play-state:paused]">
            {duplicatedPartners.map((partner, index) => (
              <div
                key={`${partner.id}-${index}`}
                className="flex-shrink-0 group"
              >
                {partner.website_url ? (
                  <a
                    href={partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover-scale border border-border/50"
                    title={`Visit ${partner.name} website`}
                  >
                    <img
                      src={partner.logo_url || `https://via.placeholder.com/120x60?text=${encodeURIComponent(partner.name)}`}
                      alt={`${partner.name} logo`}
                      className="h-12 w-auto max-w-[140px] object-contain transition-all duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div
                    className="block p-6 bg-white rounded-xl shadow-sm border border-border/50"
                    title={partner.name}
                  >
                    <img
                      src={partner.logo_url || `https://via.placeholder.com/120x60?text=${encodeURIComponent(partner.name)}`}
                      alt={`${partner.name} logo`}
                      className="h-12 w-auto max-w-[140px] object-contain transition-all duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};