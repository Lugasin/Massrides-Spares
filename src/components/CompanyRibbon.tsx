import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  description?: string;
  sort_order: number;
}

export const CompanyRibbon: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error loading partners:', error);
        // Fallback to static data if Supabase query fails
        setPartners(fallbackPartners);
      } else {
        setPartners(data || fallbackPartners);
      }
    } catch (error) {
      console.error('Error in loadPartners:', error);
      setPartners(fallbackPartners);
    } finally {
      setLoading(false);
    }
  };

  // Fallback partner data with placeholder logos
  const fallbackPartners: Partner[] = [
    {
      id: '1',
      name: 'John Deere',
      logo_url: 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=200&h=100&fit=crop&crop=center',
      website_url: 'https://www.deere.com',
      description: 'Leading manufacturer of agricultural machinery',
      sort_order: 1
    },
    {
      id: '2',
      name: 'Case IH',
      logo_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&h=100&fit=crop&crop=center',
      website_url: 'https://www.caseih.com',
      description: 'Global leader in agricultural equipment',
      sort_order: 2
    },
    {
      id: '3',
      name: 'New Holland',
      logo_url: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=200&h=100&fit=crop&crop=center',
      website_url: 'https://www.newholland.com',
      description: 'Agricultural and construction equipment',
      sort_order: 3
    },
    {
      id: '4',
      name: 'Kubota',
      logo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&h=100&fit=crop&crop=center',
      website_url: 'https://www.kubota.com',
      description: 'Compact and utility tractor specialist',
      sort_order: 4
    },
    {
      id: '5',
      name: 'Massey Ferguson',
      logo_url: 'https://images.unsplash.com/photo-1581093804475-577d72e38aa0?w=200&h=100&fit=crop&crop=center',
      website_url: 'https://www.masseyferguson.com',
      description: 'Global agricultural equipment brand',
      sort_order: 5
    },
    {
      id: '6',
      name: 'Valley Irrigation',
      logo_url: 'https://images.unsplash.com/photo-1581093458791-9d15f1b55c69?w=200&h=100&fit=crop&crop=center',
      website_url: 'https://www.valleyirrigation.com',
      description: 'Center pivot irrigation systems',
      sort_order: 6
    },
    {
      id: '7',
      name: 'Kuhn',
      logo_url: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=200&h=100&fit=crop&crop=center',
      website_url: 'https://www.kuhn.com',
      description: 'Hay and forage equipment specialist',
      sort_order: 7
    },
    {
      id: '8',
      name: 'Great Plains',
      logo_url: 'https://images.unsplash.com/photo-1581093804475-577d72e38aa0?w=200&h=100&fit=crop&crop=center',
      website_url: 'https://www.greatplainsmfg.com',
      description: 'Tillage and seeding equipment',
      sort_order: 8
    }
  ];

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
                      src={partner.logo_url}
                      alt={`${partner.name} logo`}
                      className="h-12 w-auto max-w-[120px] object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div
                    className="block p-4 bg-white rounded-lg shadow-sm"
                    title={partner.description}
                  >
                    <img
                      src={partner.logo_url}
                      alt={`${partner.name} logo`}
                      className="h-12 w-auto max-w-[120px] object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
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