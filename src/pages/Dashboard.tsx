import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Package, 
  ShoppingCart,
  ArrowUpRight,
  Calendar
} from "lucide-react";

// Demo data for charts and recent activity
const recentOrders = [
  { id: "ORD-001", customer: "Green Valley Farm", amount: "$850", status: "completed", equipment: "Engine Oil Filter" },
  { id: "ORD-002", customer: "Sunrise Agriculture", amount: "$450", status: "processing", equipment: "Hydraulic Pump" },
  { id: "ORD-003", customer: "Valley Farms Ltd", amount: "$1,250", status: "pending", equipment: "Fuel Injection Pump" },
  { id: "ORD-004", customer: "Modern Farming Co", amount: "$320", status: "completed", equipment: "Brake Pads Set" }
];

const topSpareParts = [
  { name: "Engine Oil Filters", sales: 145, revenue: "$6.5K" },
  { name: "Hydraulic Hoses", sales: 132, revenue: "$8.9K" },
  { name: "Brake Pads", sales: 98, revenue: "$4.2K" },
  { name: "Fuel Pumps", sales: 67, revenue: "$12.1K" }
];

const Dashboard = () => {
  const { user, profile, userRole, loading } = useAuth();

  if (loading) {
    return <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Loading...'}><div className="p-6 text-center">Loading dashboard...</div></DashboardLayout>;
  }

  // Basic conditional rendering based on role
  const renderDashboardContent = () => {
    // You would replace this with actual role-specific components/layouts
    if (userRole === 'admin' || userRole === 'super_admin') {
      return (
        <div className="space-y-6">
        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-primary hover:bg-primary-hover">
                Add New Part
              </Button>
              <Button variant="outline">
                Process Orders
              </Button>
              <Button variant="outline">
                Generate Report
              </Button>
              <Button variant="outline">
                Contact Suppliers
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{order.customer}</p>
                      <p className="text-sm text-muted-foreground">{order.equipment}</p>
                      <p className="text-xs text-muted-foreground">{order.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{order.amount}</p>
                      <Badge 
                        variant={order.status === 'completed' ? 'default' : 
                                order.status === 'processing' ? 'secondary' : 'outline'}
                        className="mt-1 capitalize"
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Spare Parts */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Top Selling Parts</CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topSpareParts.map((part, index) => (
                  <div key={part.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{part.name}</p>
                        <p className="text-sm text-muted-foreground">{part.sales} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{part.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Overview */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Sales Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Interactive Chart Placeholder
                </p>
                <p className="text-muted-foreground">
                  Spare parts sales performance over the last 12 months
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      );
    } else {
      // Default content for other roles (customer, vendor, guest)
      return (
        <div className="space-y-6 p-6">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome, {profile?.full_name || user?.email || 'User'}!
          </h2>
          <p className="text-muted-foreground">
            You are logged in as a <Badge variant="secondary">{userRole || 'guest'}</Badge>. Your dashboard content will appear here soon.
          </p>
        </div>
      );
    }
  };

  return (
    <DashboardLayout 
      userRole={userRole as any} 
      userName={profile?.full_name || user?.email || 'Guest'}
    >
      {renderDashboardContent()}
    </DashboardLayout>
  );
};

export default Dashboard;