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
                Powering Modern Agriculture
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                High-performance machinery for every farm. From precision planters to powerful harvesters, 
                we provide the equipment that drives agricultural success across Zambia and beyond.
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
                    Global shipping network ensuring your equipment reaches you safely and on time.
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
                    Round-the-clock technical support and maintenance services for maximum uptime.
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
                    Trusted by farmers for over a decade with proven reliability in African conditions.
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
                    Experienced agricultural specialists providing consultation and training services.
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
