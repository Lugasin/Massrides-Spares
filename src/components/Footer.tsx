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
  { label: "Engine Parts", href: "/catalog?category=Engine+Parts" },
  { label: "Hydraulic Parts", href: "/catalog?category=Hydraulic+Parts" },
  { label: "Electrical Parts", href: "/catalog?category=Electrical+Parts" },
  { label: "Brake Parts", href: "/catalog?category=Brake+Parts" },
  { label: "Used Parts", href: "/used-parts" }
];

const services = [
  { label: "Spare Parts Sales", href: "#sales" },
  { label: "Technical Support", href: "#support" },
  { label: "Financing Options", href: "#financing" },
  { label: "Installation Service", href: "#installation" },
  { label: "Warranty Claims", href: "#warranty" }
];

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      <div className="container mx-auto px-4 py-12 lg:py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2 rounded-lg font-bold text-xl shadow-lg">
                A
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-white">MASSRIDES</span>
                <span className="text-sm text-gray-300">Agricultural Spare Parts</span>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed text-sm max-w-sm">
              Leading supplier of agricultural spare parts in Zambia. Quality components, expert support, and reliable delivery to keep your equipment running.
            </p>
          </div>

          {/* Quick Links & Categories */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-300 hover:text-green-400 transition-colors text-sm hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Categories</h3>
              <ul className="space-y-2">
                {productCategories.slice(0, 5).map((category) => (
                  <li key={category.label}>
                    <a
                      href={category.href}
                      className="text-gray-300 hover:text-green-400 transition-colors text-sm hover:underline"
                    >
                      {category.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact & Services */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-white mb-4">Contact Info</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">info@massrides.co.zm</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">+260 211 843445</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">
                    H763+3HQ, Los Angeles Rd<br />Lusaka, Zambia
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">Services</h3>
              <ul className="space-y-2">
                {services.slice(0, 4).map((service) => (
                  <li key={service.label}>
                    <a
                      href={service.href}
                      className="text-gray-300 hover:text-green-400 transition-colors text-sm"
                    >
                      {service.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Newsletter Section */}
        <div className="border-t border-gray-700 pt-8 mb-8">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold text-white mb-4">
              Stay Updated with Latest Parts
            </h3>
            <p className="text-gray-300 mb-6 text-sm">
              Get notifications about new spare parts, special offers, and technical tips.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                placeholder="Enter your email"
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 h-11 flex-1"
              />
              <Button className="bg-green-600 hover:bg-green-700 text-white h-11 px-6">
                Subscribe
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            {/* Copyright */}
            <div className="text-center lg:text-left">
              <p className="text-gray-300 text-sm">
                © {new Date().getFullYear()} Massrides Company Limited. All rights reserved.
              </p>
            </div>

            {/* Policy Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
              <a href="/privacy" className="hover:text-green-400 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-green-400 transition-colors">Terms of Service</a>
              <span>•</span>
              <a href="/cookies" className="hover:text-green-400 transition-colors">Cookie Policy</a>
            </div>

            {/* Social Media */}
            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm">Follow us:</span>
              <div className="flex gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="bg-gray-800 hover:bg-green-600 text-gray-300 hover:text-white transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="bg-gray-800 hover:bg-green-600 text-gray-300 hover:text-white transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Powered by E-Place */}
          <div className="text-center mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-xs">
              Powered by <span className="text-green-400 font-medium">E-Place</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};