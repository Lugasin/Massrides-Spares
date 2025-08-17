import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Analytics = () => {
  const { user, profile, userRole } = useAuth();

  const analyticsData = {
    admin: {
      title: "System Analytics",
      cards: [
        { title: "Total Revenue", value: "$124,590", change: "+12.5%", icon: DollarSign },
        { title: "New Users", value: "245", change: "+8.2%", icon: Users },
        { title: "Orders", value: "1,234", change: "+15.3%", icon: ShoppingCart },
        { title: "Products", value: "567", change: "+4.1%", icon: Package }
      ]
    },
    vendor: {
      title: "Vendor Analytics",
      cards: [
        { title: "Sales Revenue", value: "$12,450", change: "+18.7%", icon: DollarSign },
        { title: "Products Sold", value: "89", change: "+12.3%", icon: Package },
        { title: "Active Listings", value: "34", change: "+5.2%", icon: BarChart3 },
        { title: "Customer Views", value: "2,345", change: "+25.1%", icon: TrendingUp }
      ]
    },
    customer: {
      title: "Purchase Analytics",
      cards: [
        { title: "Total Spent", value: "$3,240", change: "+22.1%", icon: DollarSign },
        { title: "Orders Placed", value: "12", change: "+3", icon: ShoppingCart },
        { title: "Favorite Items", value: "8", change: "+2", icon: Package },
        { title: "Savings", value: "$456", change: "+15.3%", icon: TrendingUp }
      ]
    }
  };

  const data = analyticsData[userRole as keyof typeof analyticsData] || analyticsData.customer;

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{data.title}</h1>
            <p className="text-muted-foreground">Detailed insights and performance metrics</p>
          </div>
          <Button>
            <TrendingUp className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.cards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-success">
                  {card.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Chart visualization coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Performance metrics coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;