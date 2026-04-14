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
  Search,
  Settings,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
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
    ...(location.pathname !== '/' ? [{ label: "Home", href: "/" }] : []),
    { label: "About Us", href: "/about" },
    { label: "Catalog", href: "/catalog" },
    ...(user ? [{ label: "Dashboard", href: "/dashboard" }] : []),
    { label: "Contact", href: "/contact" }
  ];

  const mobileNavItems = navItems.filter((item) => item.label !== "Dashboard");
  const mobileAccountItems = user
    ? [
        { label: "Profile", href: "/profile" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
        { label: "Messages", href: "/messages" },
      ]
    : [];
  const mobileManagementItems = [
    ...(userRole === 'vendor' || userRole === 'admin' || userRole === 'super_admin'
      ? [{ label: "Product Management", href: "/products-management" }]
      : []),
    ...(userRole === 'admin' || userRole === 'super_admin'
      ? [{ label: "User Management", href: "/user-management" }]
      : []),
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

  const handleMobileNavClick = (href: string) => {
    handleNavLinkClick(href);
    setIsMobileMenuOpen(false);
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
                  value={searchTerm ?? ""}
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
                  <Button variant="outline" size="sm" className="hidden gap-1 lg:flex">
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

            {cartItemsCount > 0 && (
              <Button asChild variant="ghost" size="icon" className="relative lg:hidden">
                <Link
                  to="/cart"
                  aria-label={`Cart with ${cartItemsCount} items`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                    {cartItemsCount}
                  </Badge>
                </Link>
              </Button>
            )}

            {/* Mobile menu toggle */}
            <Button variant="ghost" size="sm" className="lg:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden border-t border-border bg-background/95 backdrop-blur-md",
          isMobileMenuOpen ? "block animate-slide-down" : "hidden"
        )}>
          <nav className="space-y-4 px-4 py-4">
            {!isCatalogPage && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search spare parts..."
                  className="h-11 rounded-xl pl-10 pr-3"
                  value={searchTerm ?? ""}
                  onChange={handleInputChange}
                />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Explore
              </p>
              <div className="grid grid-cols-2 gap-2">
                {mobileNavItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleMobileNavClick(item.href);
                    }}
                    className="rounded-xl border border-border/60 bg-background px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {user && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Account
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileAccountItems.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleMobileNavClick(item.href);
                        }}
                        className="rounded-xl border border-border/60 bg-background px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>

                {mobileManagementItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Management
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {mobileManagementItems.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            handleMobileNavClick(item.href);
                          }}
                          className="rounded-xl border border-border/60 bg-background px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start px-2 py-3 font-medium text-foreground hover:bg-muted/50"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsNotificationsOpen(true);
                    }}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                    {unreadCount > 0 && <Badge className="ml-auto bg-primary text-primary-foreground">{unreadCount}</Badge>}
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start px-2 py-3 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={async () => {
                    const { error } = await signOut();
                    if (error) {
                      toast.error(`Sign out failed: ${error.message}`);
                    } else {
                      window.location.href = '/';
                    }
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            )}

            {!user && localStorage.getItem('guest_session_id') && (
              <div className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                Guest browsing is active.
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
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
