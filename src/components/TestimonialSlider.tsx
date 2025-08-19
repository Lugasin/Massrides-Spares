import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Testimonial {
  id: number;
  name: string;
  company: string;
  avatar: string;
  content: string;
  rating: number;
  location: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "John Kasongo",
    company: "Kasongo Tractor Services",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    content: "The genuine John Deere parts we ordered arrived quickly and fit perfectly. Our tractor is running like new again. The technical support team helped us identify exactly what we needed.",
    rating: 5,
    location: "Lusaka, Zambia"
  },
  {
    id: 2,
    name: "Mary Mbewe",
    company: "Mbewe Equipment Repair",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    content: "The hydraulic parts we needed were in stock and delivered the same day. This saved us days of downtime during harvest season. Their parts quality is excellent!",
    rating: 5,
    location: "Ndola, Zambia"
  },
  {
    id: 3,
    name: "Peter Banda",
    company: "Banda Agricultural Repairs",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    content: "As a mechanic, I rely on Massrides for quality spare parts. Their compatibility database is accurate and their technical support helps me serve my customers better.",
    rating: 5,
    location: "Kitwe, Zambia"
  },
  {
    id: 4,
    name: "Grace Phiri",
    company: "Phiri Farm Services",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    content: "When our combine broke down during harvest, Massrides had the electrical parts we needed in stock. Fast delivery and expert guidance got us back to work quickly!",
    rating: 5,
    location: "Chipata, Zambia"
  }
];

export const TestimonialSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToTestimonial = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            Customer Stories
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-foreground">
            What Our Customers Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hear from farmers and mechanics across Zambia who trust us for their spare parts needs
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Main Testimonial */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="w-full flex-shrink-0 bg-white/80 backdrop-blur-sm border-border/50">
                  <CardContent className="p-8 lg:p-12">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <img
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            className="w-20 h-20 lg:w-24 lg:h-24 rounded-full object-cover border-4 border-primary/20"
                            loading="lazy"
                          />
                          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center">
                            <Quote className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-center lg:text-left">
                        {/* Rating */}
                        <div className="flex items-center justify-center lg:justify-start mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                          ))}
                        </div>

                        {/* Quote */}
                        <blockquote className="text-lg lg:text-xl text-muted-foreground mb-6 italic leading-relaxed">
                          "{testimonial.content}"
                        </blockquote>

                        {/* Attribution */}
                        <div>
                          <cite className="text-lg font-semibold text-foreground not-italic">
                            {testimonial.name}
                          </cite>
                          <div className="text-sm text-muted-foreground">
                            <div>{testimonial.company}</div>
                            <div>{testimonial.location}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Dots Indicator */}
            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToTestimonial(index)}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all duration-300",
                    index === currentIndex 
                      ? "bg-primary scale-125" 
                      : "bg-border hover:bg-primary/30"
                  )}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};