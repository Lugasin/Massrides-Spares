import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const contactInfo = [
  {
    icon: Mail,
    title: "Company Email",
    details: "info@massrides.co.zm",
    description: "Send us an email anytime"
  },
  {
    icon: Phone,
    title: "Office Phone",
    details: "+260 97 575 0936",
    description: "Call us during business hours"
  },
  {
    icon: MapPin,
    title: "Office Location",
    details: "H763+3HQ, Los Angeles Rd",
    description: "Lusaka, Zambia"
  },
  {
    icon: Clock,
    title: "Working Hours",
    details: "Monday - Friday",
    description: "8:00 AM - 5:00 PM"
  }
];

export const ContactSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            Get In Touch
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-foreground">
            Contact Massrides Today
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Need spare parts for your equipment? Our team is here to help you find the exact components you need to keep your machinery running.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Contact Information */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <Card 
                  key={info.title}
                  className={cn(
                    "border-border/50 hover:shadow-earth transition-all duration-300 hover-scale",
                    "animate-fade-in"
                  )}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <info.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-card-foreground mb-1">
                          {info.title}
                        </h3>
                        <p className="font-medium text-primary mb-2">
                          {info.details}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Additional Info */}
            <Card className="mt-6 bg-secondary/10 border-secondary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="h-6 w-6 text-secondary" />
                  <h3 className="font-semibold text-card-foreground">
                    Need Quick Parts Help?
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Come see our spare parts warehouse and meet our expert team in Lusaka.
                </p>
                <Button variant="outline" size="sm" className="border-secondary text-secondary hover:bg-secondary/10">
                  WhatsApp Parts Help
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card className="border-border/50">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-card-foreground mb-2">
                    Send Us a Message
                  </h3>
                  <p className="text-muted-foreground">
                    H763+3HQ, Los Angeles Rd, Lusaka, Zambia - Parts Warehouse
                  </p>
                </div>

                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        First Name *
                      </label>
                      <Input 
                        placeholder="Enter your first name"
                        className="focus:ring-primary focus:border-primary h-11"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Last Name *
                      </label>
                      <Input 
                        placeholder="Enter your last name"
                        className="focus:ring-primary focus:border-primary h-11"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Email Address *
                      </label>
                      <Input 
                        type="email"
                        placeholder="your.email@example.com"
                        className="focus:ring-primary focus:border-primary h-11"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Phone Number
                      </label>
                      <Input 
                        type="tel"
                        placeholder="+260 XX XXX XXXX"
                        className="focus:ring-primary focus:border-primary h-11"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Equipment Interest
                    </label>
                    <select className="w-full px-3 py-2 h-11 border border-input rounded-md focus:ring-primary focus:border-primary bg-background">
                      <option value="">Select equipment type</option>
                      <option value="tractors">Tractors</option>
                      <option value="planters">Planters</option>
                      <option value="irrigation">Irrigation Systems</option>
                      <option value="parts">Parts & Accessories</option>
                      <option value="service">Service & Maintenance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Message *
                    </label>
                    <Textarea 
                      placeholder="Tell us about your equipment and the spare parts you need..."
                      rows={5}
                      className="focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="newsletter" 
                      className="rounded border-input focus:ring-primary"
                    />
                    <label htmlFor="newsletter" className="text-sm text-muted-foreground">
                      I'd like to receive updates about new spare parts and special offers
                    </label>
                  </div>

                  <Button 
                    type="submit"
                    size="lg"
                    className="bg-primary hover:bg-primary-hover shadow-primary group w-full sm:w-auto"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Map Section */}
        <Card className="overflow-hidden border-border/50">
          <div className="bg-muted/50 p-6 border-b border-border">
            <h3 className="text-xl font-bold text-card-foreground mb-2">
              Visit Our Location
            </h3>
            <p className="text-muted-foreground">
              Come see our equipment showroom and meet our expert team in Lusaka.
            </p>
          </div>
          <div className="h-64 bg-secondary/20 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-secondary mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Massrides Company Limited
              </p>
              <p className="text-muted-foreground">
                H763+3HQ, Los Angeles Rd, Lusaka, Zambia
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};