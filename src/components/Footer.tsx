import { useState } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
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
import { toast } from "sonner";

const quickLinks = [
  { label: "About Us", href: "/about" },
  { label: "Spare Parts Catalog", href: "/catalog" },
  { label: "Contact Us", href: "/contact" },
  { label: "Login", href: "/login" }
];

const productCategories = [
  { label: "Engine Parts", href: "/catalog?category=Engine+Parts" },
  { label: "Hydraulic Parts", href: "/catalog?category=Hydraulic+Parts" },
  { label: "Electrical Parts", href: "/catalog?category=Electrical+Parts" },
  { label: "Brake Parts", href: "/catalog?category=Brake+Parts" },
  { label: "View All", href: "/catalog" }
];

export const Footer = () => {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      logger.log("Newsletter subscription for:", email);
      // TODO: Implement actual newsletter subscription logic (e.g., API call)
      toast.success(`Thank you for subscribing, ${email}!`);
      setEmail('');
    } else {
      toast.error("Please enter a valid email address.");
    }
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container mx-auto px-4 py-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-1.5 rounded-lg font-bold text-lg shadow-lg">
                A
              </div>
              <span className="font-bold text-lg text-white tracking-tight">MASSRIDES</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trusted partner for quality agricultural spare parts in Zambia. Keeping your machinery running efficiently since 2024.
            </p>
            <div className="flex gap-2 pt-2">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Button size="icon" variant="ghost" className="h-8 w-8 bg-gray-800/50 hover:bg-green-600 text-gray-400 hover:text-white">
                  <Facebook className="h-4 w-4" />
                </Button>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Button size="icon" variant="ghost" className="h-8 w-8 bg-gray-800/50 hover:bg-green-600 text-gray-400 hover:text-white">
                  <Twitter className="h-4 w-4" />
                </Button>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Button size="icon" variant="ghost" className="h-8 w-8 bg-gray-800/50 hover:bg-green-600 text-gray-400 hover:text-white">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-green-400 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contact Info */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                <span>H763+3HQ, Los Angeles Rd,<br />Lusaka, Zambia</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone className="h-4 w-4 text-green-500" />
                <a href="tel:+260211843445" className="hover:text-green-400 transition-colors">+260 211 843445</a>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="h-4 w-4 text-green-500" />
                <a href="mailto:info@massrides.co.zm" className="hover:text-green-400 transition-colors">info@massrides.co.zm</a>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Stay Updated</h3>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe for the latest parts and offers.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <Input
                type="email"
                placeholder="Enter email address"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500 h-9 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white h-9 text-sm">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>
            © {new Date().getFullYear()} Massrides. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-gray-300 transition-colors">Cookies</Link>
          </div>

          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="text-green-500 font-medium">E-Place</span>
          </div>
        </div>
      </div>
    </footer>
  );
};