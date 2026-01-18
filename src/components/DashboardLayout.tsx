import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
  MessageSquare // Added missing import
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface DashboardLayoutProps {
  userRole: "super_admin" | "admin" | "vendor" | "customer" | "guest" | null;
  userName: string;
  children?: React.ReactNode;
  showMetrics?: boolean;
  metrics?: { label: string; value: string | number; icon: any; change: string }[];
}

const roleConfig = {
  super_admin: {
    title: "Super Admin Dashboard",
    description: "Complete system overview and management",
    color: "bg-purple-500",
    metrics: [
      { label: "Total Users", value: "1,234", icon: Users, change: "+12%" },
      { label: "Total Revenue", value: "$2.4M", icon: DollarSign, change: "+18%" },
      { label: "Active Vendors", value: "56", icon: Package, change: "+8%" },
      { label: "Orders Today", value: "89", icon: ShoppingCart, change: "+24%" }
    ]
  },
  admin: {
    title: "Admin Dashboard",
    description: "User and order management",
    color: "bg-blue-500",
    metrics: [
      { label: "New Users", value: "143", icon: Users, change: "+15%" },
      { label: "Orders Pending", value: "23", icon: ShoppingCart, change: "-5%" },
      { label: "Revenue Today", value: "$45K", icon: DollarSign, change: "+22%" },
      { label: "Support Tickets", value: "12", icon: Bell, change: "+3%" }
    ]
  },
  vendor: {
    title: "Vendor Dashboard",
    description: "Manage your products and orders",
    color: "bg-green-500",
    metrics: [
      { label: "Your Products", value: "24", icon: Package, change: "+5%" },
      { label: "Orders Received", value: "18", icon: ShoppingCart, change: "+12%" },
      { label: "Revenue This Month", value: "$12K", icon: DollarSign, change: "+8%" },
      { label: "Pending Orders", value: "3", icon: Bell, change: "0%" }
    ]
  },
  customer: {
    title: "Customer Dashboard",
    description: "Track your orders and quotes",
    color: "bg-blue-500",
    metrics: [
      { label: "Active Orders", value: "5", icon: ShoppingCart, change: "+2%" },
      { label: "Quote Requests", value: "3", icon: BarChart3, change: "+1%" },
      { label: "Total Spent", value: "$3.2K", icon: DollarSign, change: "+15%" },
      { label: "Saved Items", value: "12", icon: Package, change: "+4%" }
    ]
  },
  guest: {
    title: "Welcome",
    description: "Manage your products and sales",
    color: "bg-green-500",
    metrics: [
      { label: "My Products", value: "28", icon: Package, change: "+2%" },
      { label: "Orders Today", value: "8", icon: ShoppingCart, change: "+33%" },
      { label: "Revenue", value: "$12K", icon: DollarSign, change: "+28%" },
      { label: "Views", value: "1.2K", icon: TrendingUp, change: "+45%" }
    ]
  },
  support: {
    title: "Support Dashboard",
    description: "Customer support and tickets",
    color: "bg-orange-500",
    metrics: [
      { label: "Open Tickets", value: "34", icon: Bell, change: "-8%" },
      { label: "Resolved Today", value: "17", icon: Users, change: "+12%" },
      { label: "Avg Response", value: "2.4h", icon: TrendingUp, change: "-15%" },
      { label: "Customer Rating", value: "4.8", icon: BarChart3, change: "+2%" }
    ]
  }
};

export const DashboardLayout = ({ userRole, userName, children, showMetrics = true, metrics }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const config = userRole ? roleConfig[userRole] : null;

  if (!config) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { label: "Dashboard", icon: BarChart3, href: "/dashboard" },
    { label: "Products", icon: Package, href: "/products-management" },
    { label: "Orders", icon: ShoppingCart, href: "/orders" },
    { label: "Analytics", icon: TrendingUp, href: "/analytics" },
    { label: "User Management", icon: Users, href: "/user-management", roles: ["super_admin", "admin"] },
    { label: "Role Manager", icon: Users, href: "/role-manager", roles: ["super_admin", "admin"] },
    { label: "Activity Log", icon: BarChart3, href: "/activity-log", roles: ["super_admin", "admin"] },
    { label: "Payment Monitor", icon: DollarSign, href: "/payment-monitoring", roles: ["admin", "super_admin"] },
    { label: "System Health", icon: Activity, href: "/system-health", roles: ["admin", "super_admin"] },
    { label: "Settings", icon: Settings, href: "/settings" }
  ];

  const visibleNavItems = navigationItems.filter(item =>
    !item.roles || item.roles.includes(userRole)
  );

  const handleNavClick = (href: string) => {
    navigate(href);
    setIsSidebarOpen(false);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Sign out error:', error);
      toast.error(`Sign out failed: ${error.message}`);
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Menu Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Same as before */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-64 bg-background border-r border-border transition-transform duration-300 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-border">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold text-lg">
              AGRI
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground">MASSRIDES</span>
              <span className="text-xs text-muted-foreground">DASHBOARD</span>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-border">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-3", config.color)}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-medium text-foreground">{userName}</h3>
            <Badge variant="outline" className="mt-1 capitalize">
              {userRole.replace('_', ' ')}
            </Badge>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {visibleNavItems.map((item) => (
                <li key={item.label}>
                  <Button
                    variant={window.location.pathname === item.href ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      window.location.pathname === item.href && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleNavClick(item.href)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">{config.title}</h1>
                <p className="hidden md:block text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {showMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              {(metrics || config.metrics).map((metric) => (
                <Card key={metric.label} className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </CardTitle>
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground mb-1">
                      {metric.value}
                    </div>
                    <p className={cn(
                      "text-xs font-medium",
                      metric.change.startsWith('+') ? "text-success" : "text-destructive"
                    )}>
                      {metric.change} from last month
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Additional Content */}
          {children || (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Welcome to Your Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This is your {userRole.replace('_', ' ')} dashboard. Use the navigation menu to access different sections and manage your responsibilities.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};