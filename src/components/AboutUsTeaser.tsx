import { Globe, Headphones, Wheat, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const AboutUsTeaser = () => {
  return (
    <section className="py-16 bg-gradient-farm">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Translucent card with farm-green border */}
          <div className="bg-white/80 backdrop-blur-sm border-2 border-primary/20 rounded-2xl p-8 md:p-12 shadow-primary animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Keeping Agriculture Running
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                High-quality spare parts for every farm. From engine components to hydraulic parts, 
                we provide the components that keep agricultural equipment running across Zambia and beyond.
              </p>
            </div>

            {/* Two-column feature highlights */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4 group">
                <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Worldwide Delivery</h3>
                  <p className="text-muted-foreground">
                    Global shipping network ensuring your spare parts reach you safely and on time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-secondary/10 p-3 rounded-full group-hover:bg-secondary/20 transition-colors">
                  <Headphones className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">24/7 Support</h3>
                  <p className="text-muted-foreground">
                    Round-the-clock technical support and parts identification services for maximum uptime.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-success/10 p-3 rounded-full group-hover:bg-success/20 transition-colors">
                  <Wheat className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Proven Performance</h3>
                  <p className="text-muted-foreground">
                    Trusted by farmers and mechanics for over a decade with proven quality parts for African conditions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Expert Team</h3>
                  <p className="text-muted-foreground">
                    Experienced parts specialists providing technical consultation and compatibility guidance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};