import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  Search,
  Phone,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  cartItemsCount?: number;
  onCartClick?: () => void;
  onAuthClick?: () => void;
}

export const Header = ({ cartItemsCount = 0, onCartClick, onAuthClick }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Home", href: "#home" },
    { label: "Tractors", href: "#tractors" },
    { label: "Planters", href: "#planters" },
    { label: "Irrigation", href: "#irrigation" },
    { label: "Parts", href: "#parts" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" }
  ];

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      {/* Top contact bar with farm-green theme */}
      <div className="gradient-primary text-primary-foreground py-2 px-4">
        <div className="container mx-auto flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>+260 97 575 0936</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>info@massrides.co.zm</span>
            </div>
          </div>
          <div className="hidden md:block text-xs">
            Lusaka, Zambia | Mon-Fri: 8AM-5PM
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold text-xl">
              MAR
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground">MASSRIDES</span>
              <span className="text-xs text-muted-foreground">COMPANY LIMITED</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Search className="h-4 w-4" />
            </Button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onCartClick}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
                >
                  {cartItemsCount}
                </Badge>
              )}
            </Button>

            {/* Book Now CTA */}
            <Button 
              size="sm" 
              className="bg-secondary hover:bg-secondary-hover text-secondary-foreground hover-glow animate-ripple hidden md:flex"
            >
              Book Now
            </Button>

            {/* User Account */}
            <Button variant="outline" size="sm" onClick={onAuthClick}>
              <User className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Account</span>
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden mt-4 pb-4 border-t border-border transition-all duration-300",
          isMobileMenuOpen ? "block animate-slide-up" : "hidden"
        )}>
          <nav className="flex flex-col gap-3 pt-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>info@massrides.co.zm</span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};