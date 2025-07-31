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
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  userRole: "super_admin" | "admin" | "vendor" | "support";
  userName: string;
  children?: React.ReactNode;
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

export const DashboardLayout = ({ userRole, userName, children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const config = roleConfig[userRole];

  const navigationItems = [
    { label: "Dashboard", icon: BarChart3, active: true },
    { label: "Analytics", icon: TrendingUp, active: false },
    { label: "Users", icon: Users, active: false, roles: ["super_admin", "admin"] },
    { label: "Products", icon: Package, active: false },
    { label: "Orders", icon: ShoppingCart, active: false },
    { label: "Support", icon: Bell, active: false, roles: ["super_admin", "admin", "support"] },
    { label: "Settings", icon: Settings, active: false }
  ];

  const visibleNavItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Menu Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-64 bg-background border-r border-border transition-transform duration-300 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-border">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold text-lg">
              MAR
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
                    variant={item.active ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      item.active && "bg-primary text-primary-foreground"
                    )}
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
            <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive">
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
                <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
                <p className="text-muted-foreground">{config.description}</p>
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
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {config.metrics.map((metric) => (
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