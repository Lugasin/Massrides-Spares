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
  { label: "Tractors", href: "/catalog?category=Tractors" }, // Changed to route to Catalog page with filter
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
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground p-1.5 lg:p-2 rounded-lg font-bold text-lg lg:text-xl">
                MAR
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base lg:text-lg text-primary-foreground">MASSRIDES</span>
                <span className="text-xs text-primary-foreground/70">COMPANY LIMITED</span>
              </div>
            </div>
            <p className="text-primary-foreground/80 mb-4 leading-relaxed relative z-10 text-sm">
              Massrides Company LTD is a leading procurement and supply chain management company dedicated to providing high-quality sourcing, logistics, and procurement solutions. We help businesses save costs, improve efficiency, and focus on growth.
            </p>
          </div>

          {/* Quick Links */}
          <div className="relative z-10 sm:col-span-1">
            <h3 className="font-bold text-base text-primary-foreground mb-4">Quick Links & Categories</h3>
            <ul className="space-y-2 grid grid-cols-2 gap-y-2 sm:block sm:space-y-2">
              {quickLinks.map((link) => ( // Existing Quick Links
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/80 hover:text-secondary transition-colors text-sm hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              {productCategories.map((category) => ( // Product Categories as links
                <li key={category.label}>
                  <a
                    href={category.href}
                    className="text-primary-foreground/80 hover:text-secondary transition-colors text-sm hover:underline"
                  >
                    {category.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>          

          {/* Contact Info & Services */}
          <div className="relative z-10">
             {/* Contact Info */}
            <h3 className="font-bold text-base text-primary-foreground mb-4">Contact Us</h3>
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

            {/* Services */}
            <h3 className="font-bold text-base text-primary-foreground mb-4">Our Services</h3>
            <ul className="space-y-2">
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
        
        {/* Newsletter Signup (Kept separate as it's a distinct action) */}
        <div className="border-t border-background/20 pt-12 mb-12">
          <div className="max-w-2xl mx-auto text-center px-4">
            <h3 className="text-xl lg:text-2xl font-bold text-background mb-4">
              Stay Updated with Massrides
            </h3>
            <p className="text-background/80 mb-6 text-sm lg:text-base">
              Get the latest updates on new equipment, special offers, and farming tips delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                placeholder="Enter your email address"
                className="bg-background/10 border-background/30 text-background placeholder:text-background/60 focus:border-primary h-11 flex-1"
              />
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground h-11 px-6">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Social Media & Bottom */}
        <div className="border-t border-background/20 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
             {/* Copyright and Powered By */}
            <div className="text-center lg:text-left">
              <p className="text-background/80 text-sm">
                © {new Date().getFullYear()} Massrides Company Limited. All rights reserved.
              </p>
               <p className="text-background/80 text-xs mt-1">
                Powered by E-Place
               </p>
            </div>

             {/* Policy Links */}
             <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-background/60">
                <a href="#privacy" className="hover:text-primary-foreground">Privacy Policy</a>
                <span>•</span>
                <a href="#terms" className="hover:text-primary-foreground">Terms of Service</a>
                <span>•</span>
                <a href="#cookies" className="hover:text-primary-foreground">Cookie Policy</a>
              </div>

            {/* Social Media */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <span className="text-background/80 text-sm mr-2">Follow us:</span>
              <div className="flex gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="bg-background/10 hover:bg-secondary text-background hover:text-primary-foreground"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="bg-background/10 hover:bg-secondary text-background hover:text-primary-foreground"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};