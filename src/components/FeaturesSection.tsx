import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tractor,
  Wrench,
  Truck,
  Shield,
  Award,
  Users,
  Clock,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Tractor,
    title: "Genuine Parts",
    description: "Top-quality genuine and aftermarket spare parts from trusted manufacturers worldwide.",
    gradient: "gradient-primary"
  },
  {
    icon: Wrench,
    title: "Technical Support",
    description: "Expert parts identification and compatibility guidance by certified technicians.",
    gradient: "gradient-earth"
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Quick parts delivery across Zambia with real-time tracking and urgent shipping options.",
    gradient: "gradient-field"
  },
  {
    icon: Shield,
    title: "Quality Guarantee",
    description: "Comprehensive warranty and quality assurance on all our spare parts.",
    gradient: "gradient-primary"
  }
];

const stats = [
  { icon: Users, value: "500+", label: "Happy Customers" },
  { icon: Award, value: "15+", label: "Years Experience" },
  { icon: Truck, value: "10,000+", label: "Parts Delivered" },
  { icon: MapPin, value: "10+", label: "Service Centers" }
];

export const FeaturesSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            Why Choose Massrides
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-foreground">
            Your Trusted Spare Parts Partner
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We provide comprehensive spares solutions with quality components,
            expert technical support, and reliable delivery across Zambia.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className={cn(
                "group hover:shadow-earth transition-all duration-300 hover-scale border-border/50",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-4 lg:p-6">
                <div className={cn(
                  "w-10 h-10 lg:w-12 lg:h-12 rounded-lg mb-4 flex items-center justify-center",
                  feature.gradient
                )}>
                  <feature.icon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <h3 className="text-base lg:text-lg font-semibold mb-3 text-card-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-xs lg:text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-white/50 dark:bg-black/20 rounded-2xl p-6 lg:p-12 backdrop-blur-sm border border-border/50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "text-center group animate-fade-in"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <stat.icon className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                  </div>
                </div>
                <div className="text-xl lg:text-3xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-xs lg:text-sm text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 animate-fade-in">
          <h3 className="text-2xl font-bold mb-4 text-foreground">
            Need Spare Parts for Your Equipment?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Explore our complete range of spares and find the exact components you need to keep your equipment running.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary-hover shadow-primary"
            >
              Browse Parts
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              Get Technical Help
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};