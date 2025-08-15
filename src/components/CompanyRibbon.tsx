import React from 'react';

export interface Partner {
  id: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
  display_order?: number;
}

interface CompanyRibbonProps {
  partners: Partner[];
  loading?: boolean; // Added loading as optional prop
}

const CompanyRibbon: React.FC<CompanyRibbonProps> = ({ partners, loading = false }) => {
  // Duplicate partners for seamless scrolling effect
  const duplicatedPartners = [...partners, ...partners];

  if (loading) {
    return (
      <section className="py-8 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Trusted by Leading Agricultural Brands
            </h3>
          </div>
          <div className="flex space-x-8 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32 h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Trusted by Leading Agricultural Brands
          </h3>
          <p className="text-sm text-muted-foreground">
            We partner with the world's most respected agricultural equipment manufacturers
          </p>
        </div>

        {/* Scrolling Ribbon */}
        <div className="relative">
          <div className="flex animate-[scroll_30s_linear_infinite] space-x-8">
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
                    className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover-scale"
                    title={partner.description}
                  >
                    <img
                      src={partner.logo_url || `https://via.placeholder.com/120x60?text=${partner.name}`}
                      alt={`${partner.name} logo`}
                      className="h-12 w-auto max-w-[120px] object-contain transition-all duration-300"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div
                    className="block p-4 bg-white rounded-lg shadow-sm"
                    title={partner.description}
                  >
                    <img
                      src={partner.logo_url || `https://via.placeholder.com/120x60?text=${partner.name}`}
                      alt={`${partner.name} logo`}
                      className="h-12 w-auto max-w-[120px] object-contain transition-all duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Gradient Fade Edges */}
          <div className="absolute top-0 left-0 w-16 h-full bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default CompanyRibbon;
