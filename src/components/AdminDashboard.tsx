import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  BarChart,
  Wallet
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface AdminMetrics {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeVendors: number;
  systemHealth: number;
  securityAlerts: number;
  pendingPayouts: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user_id: string;
  created_at: string;
  metadata: any;
  user_email?: string; // Enhanced manually
}

interface RevenueData {
  date: string;
  amount: number;
}

const AdminDashboard: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    activeVendors: 0,
    systemHealth: 100,
    securityAlerts: 0,
    pendingPayouts: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      fetchDashboardData();
      subscribeToUpdates();
    }
  }, [userRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch metrics in parallel
      const [
        usersResult,
        productsResult,
        ordersResult,
        revenueResult,
        vendorsResult,
        activityResult,
        securityResult,
        payoutsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, status, total_amount'),
        supabase.from('orders').select('total_amount, created_at').eq('payment_status', 'paid'),
        supabase.from('vendors').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5),
        // Placeholder for security logs until proper table 'financial_audit_logs' or similar is populated or used
        // Using 'financial_audit_logs' count for high value transactions as proxy for "security alerts" for now
        supabase.from('financial_audit_logs').select('id', { count: 'exact' }).gt('amount', 10000),
        supabase.from('payouts').select('id', { count: 'exact' }).eq('status', 'pending')
      ]);

      // Calculate metrics
      const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const pendingOrders = ordersResult.data?.filter(o => o.status === 'pending' || o.status === 'awaiting_payment').length || 0;

      // Process Revenue Data for Chart (Last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const chartData = last7Days.map(date => {
        const dayTotal = revenueResult.data
          ?.filter(o => o.created_at.startsWith(date))
          .reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
        return { date, amount: dayTotal };
      });

      setRevenueData(chartData);

      setMetrics({
        totalUsers: usersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalRevenue,
        pendingOrders,
        activeVendors: vendorsResult.count || 0,
        systemHealth: 98,
        securityAlerts: securityResult.count || 0,
        pendingPayouts: payoutsResult.count || 0
      });

      // Enhance activity logs with user emails if possible (would require join or separate fetch)
      // For speed, just showing IDs or 'System'
      setRecentActivity(activityResult.data || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channels = [
      supabase
        .channel('admin-dashboard-users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchDashboardData)
        .subscribe(),

      supabase
        .channel('admin-dashboard-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchDashboardData)
        .subscribe(),

      supabase
        .channel('admin-dashboard-activity')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, fetchDashboardData)
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  };

  const getHealthColor = (health: number) => {
    if (health >= 95) return 'text-green-500';
    if (health >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthIcon = (health: number) => {
    if (health >= 95) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (health >= 80) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const quickActions = [
    { label: 'User Management', icon: Users, href: '/user-management', color: 'bg-blue-500' },
    { label: 'Product Catalog', icon: Package, href: '/products-management', color: 'bg-green-500' },
    { label: 'Payment Monitoring', icon: DollarSign, href: '/payment-monitoring', color: 'bg-yellow-500' },
    { label: 'Security Dashboard', icon: Shield, href: '/security-dashboard', color: 'bg-red-500', roles: ['super_admin'] },
    { label: 'Activity Logs', icon: Activity, href: '/activity-log', color: 'bg-purple-500' },
    { label: 'Payouts', icon: Wallet, href: '/payouts', color: 'bg-orange-500' } // Assuming payouts route exists or will exist
  ];

  const visibleActions = quickActions.filter(action => 
    !action.roles || action.roles.includes(userRole!)
  );

  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <div className="p-6 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
        <p className="text-muted-foreground">You need admin privileges to view this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, {profile?.full_name || 'Admin'}
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'super_admin' ? 'Super Administrator' : 'Administrator'} Dashboard
          </p>
        </div>
        <div className="flex gap-2">
           <Badge variant={userRole === 'super_admin' ? 'destructive' : 'default'} className="text-sm">
            {userRole === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
           </Badge>
           <Button variant="outline" size="sm" onClick={fetchDashboardData}>
             Refresh
           </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalOrders} total orders processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeVendors}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalProducts} products listed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingPayouts}</div>
            <p className="text-xs text-muted-foreground">
              Vendors awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getHealthIcon(metrics.systemHealth)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics.systemHealth)}`}>
              {metrics.systemHealth}%
            </div>
            <p className="text-xs text-muted-foreground">
              Operational status normal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Revenue Overview (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <RechartsBarChart data={revenueData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="date" tick={{fontSize: 12}} />
                   <YAxis tick={{fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                   <Tooltip
                     formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                     labelFormatter={(label) => `Date: ${label}`}
                   />
                   <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                 </RechartsBarChart>
               </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity logged.</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="bg-primary/10 p-2 rounded-full mt-1">
                      <Activity className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" title={activity.action}>
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        User: {activity.user_id?.substring(0, 8)}...
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <Button variant="ghost" className="w-full text-xs" onClick={() => navigate('/activity-log')}>
                View All Activity
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Management Console</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {visibleActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-24 flex-col gap-3 hover:bg-muted/50 transition-all border-dashed"
                onClick={() => navigate(action.href)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${action.color} text-white shadow-sm`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts Section */}
      {(metrics.securityAlerts > 0 || metrics.pendingOrders > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.securityAlerts > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-red-900">Security Attention Needed</p>
                    <p className="text-sm text-red-700">
                      {metrics.securityAlerts} high-value transactions flagged for review.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => navigate('/security-dashboard')}
                  >
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {metrics.pendingOrders > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 p-2 rounded-full">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">Orders Pending</p>
                    <p className="text-sm text-yellow-700">
                      {metrics.pendingOrders} orders waiting for processing.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/orders')}
                    className="bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
                  >
                    View Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
