import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  Search,
  Mail,
  Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuote } from "@/context/QuoteContext";

interface HeaderProps {
  onCartClick?: () => void;
  onAuthClick?: () => void;
}

export const Header = ({ onCartClick, onAuthClick }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { items } = useQuote();
  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Streamlined navigation options
  const navItems = [
    { label: "Home", href: "#home" },
    { label: "About Us", href: "#about" },
    { label: "Catalog", href: "#catalog" },
    { label: "Contact", href: "#contact" }
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* Main navigation with translucency and blur */}
      <div className="bg-background/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo with Leaf accent */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-primary text-primary-foreground p-2 rounded-lg">
              <span className="font-bold text-xl">AGRI</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground">MASSRIDES</span>
              <span className="text-xs text-muted-foreground">COMPANY LIMITED</span>
            </div>
            <Leaf className="h-5 w-5 text-secondary-foreground animate-pulse" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
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

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Search icon */}
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Search className="h-4 w-4" />
            </Button>

            {/* Cart with badge */}
            <Button variant="ghost" size="sm" onClick={onCartClick} className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                  {cartItemsCount}
                </Badge>
              )}
            </Button>

            {/* Book Now CTA */}
            <Button size="sm" className="bg-secondary hover:bg-secondary-hover text-secondary-foreground hidden md:flex animate-pulse">
              Book Now
            </Button>

            {/* User account */}
            <Button variant="outline" size="sm" onClick={onAuthClick}>
              <User className="h-4 w-4 mr-1" />
              <span className="hidden md::inline">Account</span>
            </Button>

            {/* Mobile menu toggle */}
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden bg-background/70 backdrop-blur-md border-t border-border",
          isMobileMenuOpen ? "block animate-slide-down" : "hidden"
        )}>
          <nav className="flex flex-col px-4 py-3 gap-2">
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

// Note: For global lazy loading, wrap <img> tags with loading="lazy", and implement a separate <Loader> component with a rotating tractor wheel and smoke animations for full-page loads.
