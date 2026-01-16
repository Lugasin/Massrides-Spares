import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import NotificationsPanel from "@/components/NotificationsPanel";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Bell,
  LayoutDashboard,
  Leaf,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShoppingCart,
  User,
  UserPlus,
  Users,
  LogIn,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if the current page is the catalog page
  const isCatalogPage = location.pathname === '/catalog';

  // Streamlined navigation options
  const navItems = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Catalog", href: "/catalog" },
    ...(user ? [{ label: "Dashboard", href: "/dashboard" }] : []),
    { label: "Contact", href: "/contact" }
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
      <div className="bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-2 lg:py-3 flex items-center justify-between">
          {/* Logo with Leaf accent */}
          <div className="flex items-center gap-2">
            {/* Use Link for logo to navigate to home */}
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center bg-primary text-primary-foreground p-1.5 lg:p-2 rounded-lg">
                <span className="font-bold text-sm lg:text-xl">AGRI</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-sm lg:text-lg text-foreground">MASSRIDES</span>
                <span className="text-xs text-muted-foreground hidden lg:block">SPARE PARTS</span>
              </div>
              <Leaf className="h-4 w-4 lg:h-5 lg:w-5 text-secondary-foreground animate-pulse" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className={cn("hidden lg:flex items-center gap-6 xl:gap-8", { "mx-auto w-full justify-center": isCatalogPage })}>
            {navItems.map((item) => (
              <a // Using <a> for hash links, Link for routes
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault(); // Prevent default link behavior
                  handleNavLinkClick(item.href);
                }}
                className="text-foreground hover:text-primary transition-colors font-medium text-sm xl:text-base"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className={cn("flex items-center gap-2 lg:gap-4", { "w-full justify-end": isCatalogPage })}>
            {/* Search Input (instead of icon button) - Conditionally rendered */}
            {!isCatalogPage && (
              <div className="relative hidden lg:flex items-center">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search spare parts..."
                  className="pl-10 pr-3 py-2 rounded-md w-48 xl:w-64"
                  value={searchTerm}
                  onChange={handleInputChange}
                />
              </div>
            )}

            {/* Cart with badge */}
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative hidden lg:flex"
              onClick={() => setIsNotificationsOpen(true)}
            >
              <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                {unreadCount > 0 ? unreadCount : 0}
              </Badge>
            </Button>

            {/* Messages - Desktop only */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="relative hidden lg:flex"
                onClick={() => navigate('/messages')}
              >
                <MessageSquare className="h-4 w-4 lg:h-5 lg:w-5" />
              </Button>
            )}

            <Link to="/cart" className="hidden lg:block">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5" />
                {cartItemsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Shop Now CTA - Conditionally rendered */}
            {!isCatalogPage && (
              <Button
                size="sm"
                className="bg-secondary hover:bg-secondary-hover text-secondary-foreground hidden lg:flex animate-pulse"
                onClick={handleShopNowClick}
              >
                Shop Parts
              </Button>
            )}

            {/* User account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs lg:text-sm">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/messages')}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Messages</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    const { error } = await signOut();
                    if (error) {
                      toast.error(`Sign out failed: ${error.message}`);
                    } else {
                      window.location.href = '/';
                    }
                  }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                {localStorage.getItem('guest_session_id') && (
                  <Badge variant="secondary" className="text-xs hidden sm:inline-flex">Guest</Badge>
                )}
                {/* Auth buttons hidden as per request */}
              </div>
            )}

            {/* Mobile menu toggle */}
            <Button variant="ghost" size="sm" className="lg:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden bg-background/95 backdrop-blur-md border-t border-border",
          isMobileMenuOpen ? "block animate-slide-down" : "hidden"
        )}>
          <nav className="flex flex-col px-4 py-3 gap-1">
            {/* Search on mobile */}
            {!isCatalogPage && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search spare parts..."
                  className="pl-10 pr-3 py-2 rounded-md h-10"
                  value={searchTerm}
                  onChange={handleInputChange}
                />
              </div>
            )}

            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavLinkClick(item.href);
                  setIsMobileMenuOpen(false);
                }}
                className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50"
              >
                {item.label}
              </a>
            ))}

            {/* Mobile user menu */}
            <div className="border-t border-border mt-2 pt-2">
              {user ? (
                <div className="flex flex-col gap-1">
                  {/* Secondary Desktop actions moved to primary Mobile links */}
                  <Link to="/cart" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50 flex items-center justify-between">
                    <div className="flex items-center">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Cart
                    </div>
                    {cartItemsCount > 0 && <Badge className="bg-primary text-primary-foreground">{cartItemsCount}</Badge>}
                  </Link>

                  <Button
                    variant="ghost"
                    className="justify-start px-2 py-3 h-auto font-medium hover:bg-muted/50 text-foreground"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsNotificationsOpen(true);
                    }}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                    {unreadCount > 0 && <Badge className="ml-auto bg-primary text-primary-foreground">{unreadCount}</Badge>}
                  </Button>

                  <Link to="/messages" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50 flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Messages
                  </Link>

                  <Separator className="my-1" />

                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50 flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50 flex items-center">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>

                  {/* Role-based links */}
                  {(userRole === 'vendor' || userRole === 'admin') && (
                    <Link to="/dashboard/products" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50 flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      Product Management
                    </Link>
                  )}

                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <Link to="/dashboard/users" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50 flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      User Management
                    </Link>
                  )}

                  <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50 flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>

                  <Separator className="my-1" />

                  <Button variant="ghost" className="justify-start px-2 py-3 h-auto text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                    const { error } = await signOut();
                    if (error) {
                      toast.error(`Sign out failed: ${error.message}`);
                    } else {
                      window.location.href = '/';
                    }
                    setIsMobileMenuOpen(false);
                  }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {localStorage.getItem('guest_session_id') && (
                    <div className="px-2 py-1">
                      <Badge variant="secondary" className="text-xs">Guest User</Badge>
                    </div>
                  )}

                  {/* Cart, Notifications, Messages for mobile when logged out */}
                  <Link to="/cart" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary transition-colors font-medium py-3 px-2 rounded-md hover:bg-muted/50 flex items-center justify-between">
                    <div className="flex items-center">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Cart
                    </div>
                    {cartItemsCount > 0 && <Badge className="bg-primary text-primary-foreground">{cartItemsCount}</Badge>}
                  </Link>

                  {/* Auth buttons hidden in mobile menu */}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 py-2 px-2 text-sm text-muted-foreground border-t border-border mt-2 pt-3">
              <Mail className="h-4 w-4" />
              <span>info@massrides.co.zm</span>
            </div>
          </nav>
        </div>
      </div>

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </header>
  );
};

// Note: For global lazy loading, wrap <img> tags with loading="lazy", and implement a separate <Loader> component with a rotating tractor wheel and smoke animations for full-page loads.
