import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/integrations/supabase/client';

type VendorDashboardData = {
  kind: 'vendor';
  totalRevenue?: number;
  totalOrders?: number;
  totalProducts?: number;
  lowStockProducts?: Array<unknown>;
};

type AdminDashboardData = {
  kind: 'admin';
  stats?: {
    totalRevenue?: number;
    totalUsers?: number;
    totalOrders?: number;
    pendingOrders?: number;
    totalProducts?: number;
    activeVendors?: number;
  };
};

type DashboardData = VendorDashboardData | AdminDashboardData | null;

const Analytics = () => {
  const { user, profile, userRole, session, ready } = useAuth();
  const { formatCurrency } = useSettings();
  const [dashboardData, setDashboardData] = useState<DashboardData>(null);
  const layoutRole =
    userRole === 'super_admin' ||
    userRole === 'admin' ||
    userRole === 'vendor' ||
    userRole === 'customer'
      ? userRole
      : 'guest';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (!ready) {
          return;
        }

        if (!session?.access_token) {
          setDashboardData(null);
          return;
        }

        if (!profile) {
          return;
        }

        if (userRole === 'vendor' && profile) {
          const { data, error } = await supabase.functions.invoke('get-vendor-dashboard-data', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          if (error) throw error;
          setDashboardData({ kind: 'vendor', ...data.dashboardData } as VendorDashboardData);
          return;
        }

        if ((userRole === 'admin' || userRole === 'super_admin') && profile) {
          const { data, error } = await supabase.functions.invoke('get-admin-dashboard-data', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          if (error) throw error;
          setDashboardData({ kind: 'admin', ...data.dashboardData } as AdminDashboardData);
          return;
        }

        setDashboardData(null);
      } catch (error: unknown) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchAnalytics();
  }, [profile, ready, session?.access_token, userRole]);

  const viewData = useMemo(() => {
    if (dashboardData?.kind === 'vendor' && userRole === 'vendor') {
      return {
        title: "Vendor Analytics",
        cards: [
          { title: "Sales Revenue", value: `$${(dashboardData.totalRevenue || 0).toLocaleString()}`, change: "Gross", icon: DollarSign },
          { title: "Total Orders", value: dashboardData.totalOrders?.toString() || "0", change: "Total", icon: ShoppingCart },
          { title: "Active Products", value: dashboardData.totalProducts?.toString() || "0", change: "Live", icon: Package },
          { title: "Low Stock", value: (dashboardData.lowStockProducts?.length ?? 0).toString(), change: "Alerts", icon: BarChart3 }
        ]
      };
    }

    if (dashboardData?.kind === 'admin' && (userRole === 'admin' || userRole === 'super_admin')) {
      return {
        title: userRole === 'super_admin' ? "Super Admin Analytics" : "Admin Analytics",
        cards: [
          { title: "Total Revenue", value: formatCurrency(dashboardData.stats?.totalRevenue || 0), change: "Paid Orders", icon: DollarSign },
          { title: "Users", value: `${dashboardData.stats?.totalUsers || 0}`, change: "Registered", icon: Users },
          { title: "Orders", value: `${dashboardData.stats?.totalOrders || 0}`, change: `${dashboardData.stats?.pendingOrders || 0} pending`, icon: ShoppingCart },
          { title: "Products", value: `${dashboardData.stats?.totalProducts || 0}`, change: `${dashboardData.stats?.activeVendors || 0} active vendors`, icon: Package }
        ]
      };
    }

    return {
      title: "System Analytics",
      cards: [
        { title: "Total Revenue", value: "$0", change: "-", icon: DollarSign },
        { title: "New Users", value: "0", change: "-", icon: Users },
        { title: "Orders", value: "0", change: "-", icon: ShoppingCart },
        { title: "Products", value: "0", change: "-", icon: Package }
      ]
    };
  }, [dashboardData, formatCurrency, userRole]);

  return (
    <DashboardLayout userRole={layoutRole} userName={profile?.full_name || user?.email || 'User'} showMetrics={false}>
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
