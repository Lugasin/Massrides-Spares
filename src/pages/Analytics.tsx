import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/integrations/supabase/client';

const Analytics = () => {
  const { user, profile, userRole } = useAuth();
  const { formatCurrency } = useSettings();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        if (userRole === 'vendor') {
          const { data, error } = await supabase.functions.invoke('get-vendor-dashboard-data');
          if (error) throw error;
          setDashboardData(data.dashboardData);
        }
        // Future: Add Admin analytics fetch here
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userRole]);

  const viewData = useMemo(() => {
    if (userRole === 'vendor' && dashboardData) {
      return {
        title: "Vendor Analytics",
        cards: [
          { title: "Sales Revenue", value: `$${(dashboardData.totalRevenue || 0).toLocaleString()}`, change: "Gross", icon: DollarSign },
          { title: "Total Orders", value: dashboardData.totalOrders?.toString() || "0", change: "Total", icon: ShoppingCart },
          { title: "Active Products", value: dashboardData.totalProducts?.toString() || "0", change: "Live", icon: Package },
          { title: "Low Stock", value: dashboardData.lowStockProducts?.length.toString() || "0", change: "Alerts", icon: BarChart3 }
        ]
      };
    }

    // Default fallback (e.g. for Admin until implemented)
    return {
      title: "System Analytics",
      cards: [
        { title: "Total Revenue", value: "$0", change: "-", icon: DollarSign },
        { title: "New Users", value: "0", change: "-", icon: Users },
        { title: "Orders", value: "0", change: "-", icon: ShoppingCart },
        { title: "Products", value: "0", change: "-", icon: Package }
      ]
    };
  }, [userRole, dashboardData]);

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'} showMetrics={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{viewData.title}</h1>
            <p className="text-muted-foreground">Detailed insights and performance metrics</p>
          </div>
          <Button>
            <TrendingUp className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {viewData.cards.map((card, index) => (
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
                  {card.change}
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