import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Partner {
  id: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
  display_order?: number;
  active?: boolean;
}

export const CompanyRibbon: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      // Try to load from database first
      const { data, error } = await supabase
        .from('company_partners')
        .select('*')
        .eq('active', true)
        .order('display_order');

      if (error) {
        console.error('Error loading partners from database:', error);
        setPartners(fallbackPartners);
      } else if (data && data.length > 0) {
        setPartners(data);
      } else {
        setPartners(fallbackPartners);
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
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/John-Deere-Logo.png',
      website_url: 'https://www.deere.com',
      description: 'Leading manufacturer of agricultural machinery',
      display_order: 1
    },
    {
      id: '2',
      name: 'Case IH',
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/Case-IH-Logo.png',
      website_url: 'https://www.caseih.com',
      description: 'Global leader in agricultural equipment',
      display_order: 2
    },
    {
      id: '3',
      name: 'New Holland',
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/New-Holland-Logo.png',
      website_url: 'https://www.newholland.com',
      description: 'Agricultural and construction equipment',
      display_order: 3
    },
    {
      id: '4',
      name: 'Kubota',
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/Kubota-Logo.png',
      website_url: 'https://www.kubota.com',
      description: 'Compact and utility tractor specialist',
      display_order: 4
    },
    {
      id: '5',
      name: 'Massey Ferguson',
      logo_url: 'https://1000logos.net/wp-content/uploads/2020/09/Massey-Ferguson-Logo.png',
      website_url: 'https://www.masseyferguson.com',
      description: 'Global agricultural equipment brand',
      display_order: 5
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
                      src={partner.logo_url || 'https://via.placeholder.com/120x60?text=' + partner.name}
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
                      src={partner.logo_url || 'https://via.placeholder.com/120x60?text=' + partner.name}
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