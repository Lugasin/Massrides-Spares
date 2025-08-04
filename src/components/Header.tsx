import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Import Input
import { 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  Search,
  Mail,
  Leaf,
  LogOut,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils"; // Utility for conditional classnames
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Link, useNavigate, useLocation } from "react-router-dom";

interface HeaderProps {
  cartItemsCount?: number;
  onAuthClick?: () => void;
  searchTerm?: string; 
  onSearchChange?: (term: string) => void; 
}

export const Header = ({
  cartItemsCount = 0,
  onAuthClick,
  searchTerm,
  onSearchChange
}: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, userRole, signOut } = useAuth(); // Get user, userRole, and signOut from useAuth context
  const navigate = useNavigate();
  const location = useLocation(); // Initialize useLocation

  // Determine if the current page is the catalog page
  const isCatalogPage = location.pathname === '/catalog';

  // Streamlined navigation options
  const navItems = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/#about" },
    { label: "Catalog", href: "/catalog" },
    { label: "Quotes/Messaging", href: "/dashboard/quotes" }, // Added Quotes/Messaging link
    { label: "Contact", href: "/#contact" }
  ];

  // Handle navigation for hash links and routes
  const handleNavLinkClick = (href: string) => {
    if (href.startsWith('/#')) {
      // Handle hash links for scrolling
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Handle route navigation
      navigate(href);
    }
  };

  // Navigate to catalog page on Shop Now click
  const handleShopNowClick = () => {
    navigate('/catalog');
  };

  // Handle search input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(event.target.value);
    }
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Main navigation with translucency and blur */}
      <div className="bg-background/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo with Leaf accent */}
          <div className="flex items-center gap-2">
            {/* Use Link for logo to navigate to home */}
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center bg-primary text-primary-foreground p-2 rounded-lg">
                <span className="font-bold text-xl">AGRI</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-foreground">MASSRIDES</span>
                <span className="text-xs text-muted-foreground">COMPANY LIMITED</span>
              </div>
              <Leaf className="h-5 w-5 text-secondary-foreground animate-pulse" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className={cn("hidden lg:flex items-center gap-8", { "mx-auto w-full justify-center": isCatalogPage })}>{/* Conditionally center nav and make it full width */}
            {navItems.map((item) => (
              <a // Using <a> for hash links, Link for routes
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault(); // Prevent default link behavior
                  handleNavLinkClick(item.href);
                }}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className={cn("flex items-center gap-4", { "w-full justify-end": isCatalogPage })}>{/* Adjust actions div for centering effect */}
            {/* Search Input (instead of icon button) - Conditionally rendered */}
            {!isCatalogPage && (
              <div className="relative hidden md:flex items-center">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  className="pl-10 pr-3 py-2 rounded-md"
                  value={searchTerm}
                  onChange={handleInputChange}
                />
              </div>
            )}

            {/* Cart with badge */}
             {/* TODO: openCart should come from a CartContext */}
            <Button variant="ghost" size="sm" /*onClick={openCart}*/ className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                  {cartItemsCount}
                </Badge>
              )}
            </Button>

            {/* Shop Now CTA - Conditionally rendered */}
            {!isCatalogPage && (
              <Button 
                size="sm" 
                className="bg-secondary hover:bg-secondary-hover text-secondary-foreground hidden md:flex animate-pulse"
                onClick={handleShopNowClick}
              >
                Shop Now
              </Button>
            )}

            {/* User account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-1" />
                    <span className="hidden md:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  {(userRole === 'vendor' || userRole === 'admin') && (
                    <DropdownMenuItem onClick={() => navigate('/dashboard/products')}>
                       <span>Product Management</span>
                    </DropdownMenuItem>
                  )}
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                     <DropdownMenuItem onClick={() => navigate('/dashboard/users')}>
                       <span>User Management</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                     <LogOut className="mr-2 h-4 w-4" /> {/* Using Lucide icon */}
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={onAuthClick}>Login / Register</Button>
            )}

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
              <a // Using <a> for hash links, Link for routes
                key={item.label}
                href={item.href}
                 onClick={(e) => {
                  e.preventDefault(); // Prevent default link behavior
                  handleNavLinkClick(item.href);
                  setIsMobileMenuOpen(false); // Close mobile menu on click
                }}
                className="text-foreground hover:text-primary transition-colors font-medium py-2"
              >
                {item.label}
              </a>
            ))}
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
               {user ? (
                 <div className="flex flex-col gap-2">
                    <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-2">Dashboard</Link>
                     {(userRole === 'vendor' || userRole === 'admin') && (
                       <Link to="/dashboard/products" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-2">Product Management</Link>
                     )}
                     {(userRole === 'admin' || userRole === 'super_admin') && (
                       <Link to="/dashboard/users" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-2">User Management</Link>
                     )}
                     <Button variant="ghost" className="justify-start px-0" onClick={() => {
                         signOut();
                         setIsMobileMenuOpen(false); // Close mobile menu on logout
                     }}>Logout</Button>
                 </div>
               ) : (
                 <Button variant="ghost" className="justify-start px-0 py-2" onClick={() => { onAuthClick?.(); setIsMobileMenuOpen(false); }}>Login / Register</Button>
               )}
            </div>
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground border-t border-border mt-2 pt-2">
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
