import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Mail, 
  Phone, 
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ArrowRight
} from "lucide-react";

const quickLinks = [
  { label: "About Us", href: "#about" },
  { label: "Our Services", href: "#services" },
  { label: "Why Choose Us", href: "#features" },
  { label: "Contact Us", href: "#contact" }
];

const productCategories = [
  { label: "Tractors", href: "#tractors" },
  { label: "Planters", href: "#planters" },
  { label: "Irrigation Systems", href: "#irrigation" },
  { label: "Parts & Accessories", href: "#parts" },
  { label: "Used Equipment", href: "#used" }
];

const services = [
  { label: "Equipment Sales", href: "#sales" },
  { label: "Maintenance & Repair", href: "#service" },
  { label: "Financing Options", href: "#financing" },
  { label: "Training Programs", href: "#training" },
  { label: "Technical Support", href: "#support" }
];

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground relative overflow-hidden">
      {/* Dark farm-green background with translucent overlay */}
      <div className="absolute inset-0 gradient-primary opacity-90"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent"></div>
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold text-xl">
                MAR
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-primary-foreground">MASSRIDES</span>
                <span className="text-xs text-primary-foreground/70">COMPANY LIMITED</span>
              </div>
            </div>
            <p className="text-primary-foreground/80 mb-6 leading-relaxed relative z-10">
              Massrides Company LTD is a leading procurement and supply chain management company dedicated to providing high-quality sourcing, logistics, and procurement solutions. We help businesses save costs, improve efficiency, and focus on growth.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-secondary" />
                <span className="text-sm text-primary-foreground/80">info@massrides.co.zm</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-secondary" />
                <span className="text-sm text-primary-foreground/80">+260 211 843445 | +260 967 729310</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-secondary mt-0.5" />
                <span className="text-sm text-primary-foreground/80">
                  H763+3HQ, Los Angeles Rd, Lusaka, Zambia
                </span>
              </div>
            </div>

            {/* Working Hours */}
            <div className="text-sm text-primary-foreground/80 relative z-10">
              <span className="font-medium text-primary-foreground">Working Hours:</span> Monday – Friday: 8 AM – 5 PM
            </div>
          </div>

          {/* Quick Links */}
          <div className="relative z-10">
            <h3 className="font-bold text-lg text-primary-foreground mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-primary-foreground/80 hover:text-secondary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div className="relative z-10">
            <h3 className="font-bold text-lg text-primary-foreground mb-4">Products</h3>
            <ul className="space-y-3">
              {productCategories.map((category) => (
                <li key={category.label}>
                  <a 
                    href={category.href}
                    className="text-primary-foreground/80 hover:text-secondary transition-colors text-sm"
                  >
                    {category.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="relative z-10">
            <h3 className="font-bold text-lg text-primary-foreground mb-4">Services</h3>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.label}>
                  <a 
                    href={service.href}
                    className="text-primary-foreground/80 hover:text-secondary transition-colors text-sm"
                  >
                    {service.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-background/20 pt-12 mb-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-background mb-4">
              Stay Updated with Massrides
            </h3>
            <p className="text-background/80 mb-6">
              Get the latest updates on new equipment, special offers, and farming tips delivered to your inbox.
            </p>
            <div className="flex gap-3 max-w-md mx-auto">
              <Input 
                placeholder="Enter your email address"
                className="bg-background/10 border-background/30 text-background placeholder:text-background/60 focus:border-primary"
              />
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Social Media & Bottom */}
        <div className="border-t border-background/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Social Media */}
            <div className="flex items-center gap-4">
              <span className="text-background/80 text-sm mr-2">Follow us:</span>
              <div className="flex gap-3">
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="bg-background/10 hover:bg-primary text-background hover:text-primary-foreground"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="bg-background/10 hover:bg-primary text-background hover:text-primary-foreground"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="bg-background/10 hover:bg-primary text-background hover:text-primary-foreground"
                >
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="bg-background/10 hover:bg-primary text-background hover:text-primary-foreground"
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Copyright */}
            <div className="text-center">
              <p className="text-background/80 text-sm">
                © 2024 Massrides Company Limited. All rights reserved.
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-background/60">
                <a href="#privacy" className="hover:text-primary">Privacy Policy</a>
                <span>•</span>
                <a href="#terms" className="hover:text-primary">Terms of Service</a>
                <span>•</span>
                <a href="#cookies" className="hover:text-primary">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};