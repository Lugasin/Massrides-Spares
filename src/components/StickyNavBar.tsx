import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface StickyNavBarProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export const StickyNavBar: React.FC<StickyNavBarProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  className
}) => {
  const [underlineStyle, setUnderlineStyle] = useState({ width: 0, left: 0 });

  useEffect(() => {
    // Update underline position when active category changes
    const activeButton = document.querySelector(`[data-category="${activeCategory}"]`) as HTMLElement;
    if (activeButton) {
      const rect = activeButton.getBoundingClientRect();
      const container = activeButton.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        setUnderlineStyle({
          width: rect.width,
          left: rect.left - containerRect.left
        });
      }
    }
  }, [activeCategory]);

  return (
    <div className={cn(
      "transition-all duration-300 z-40 relative w-full bg-background/80 backdrop-blur-sm transition-all duration-300 z-30",
      className
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="relative flex items-center justify-center">
          {/* Background blur effect */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg" />
          
          {/* Categories */}
          <div className="relative flex flex-wrap justify-center gap-2 p-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                data-category={category.id}
                variant={activeCategory === category.id ? "default" : "ghost"}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "relative transition-all duration-300 hover:scale-105",
                  activeCategory === category.id 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "hover:bg-primary/10 hover:text-primary"
                )}
              >
                {category.icon && (
                  <span className="mr-2">
                    {category.icon}
                  </span>
                )}
                {category.label}
                
                {/* Micro-interaction: ripple effect */}
                <span className="absolute inset-0 rounded-md bg-white/20 scale-0 transition-transform duration-300 group-hover:scale-100" />
              </Button>
            ))}
            
            {/* Animated underline */}
            <div 
              className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-out"
              style={{
                width: `${underlineStyle.width}px`,
                left: `${underlineStyle.left}px`,
                opacity: activeCategory ? 1 : 0
              }}
            />
          </div>

          {/* Scroll spy indicator */}
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
            <div className="flex items-center space-x-1">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    activeCategory === category.id
                      ? "bg-primary scale-125"
                      : "bg-border hover:bg-primary/30"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};