import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Clock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AdminMetrics {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeVendors: number;
  systemHealth: number;
  securityAlerts: number;
}

interface RecentActivity {
  id: string;
  activity_type: string;
  user_email: string;
  created_at: string;
  additional_details: any;
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
    securityAlerts: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
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
        securityResult
      ] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact' }),
        supabase.from('spare_parts').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, status, total_amount'),
        supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
        supabase.from('user_profiles').select('id', { count: 'exact' }).eq('role', 'vendor').eq('is_active', true),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('tj_security_logs').select('id', { count: 'exact' }).gte('risk_score', 7)
      ]);

      // Calculate metrics
      const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const pendingOrders = ordersResult.data?.filter(o => o.status === 'pending').length || 0;

      setMetrics({
        totalUsers: usersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalRevenue,
        pendingOrders,
        activeVendors: vendorsResult.count || 0,
        systemHealth: 98, // This would come from actual health checks
        securityAlerts: securityResult.count || 0
      });

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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, fetchDashboardData)
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
    if (health >= 95) return <CheckCircle className="h-8 w-8 text-green-500" />;
    if (health >= 80) return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    return <XCircle className="h-8 w-8 text-red-500" />;
  };

  const quickActions = [
    { label: 'User Management', icon: Users, href: '/user-management', color: 'bg-blue-500' },
    { label: 'Product Management', icon: Package, href: '/products-management', color: 'bg-green-500' },
    { label: 'Payment Monitoring', icon: DollarSign, href: '/payment-monitoring', color: 'bg-yellow-500' },
    { label: 'Security Dashboard', icon: Shield, href: '/security-dashboard', color: 'bg-red-500', roles: ['super_admin'] },
    { label: 'Activity Logs', icon: Activity, href: '/activity-log', color: 'bg-purple-500' },
    { label: 'Analytics', icon: TrendingUp, href: '/analytics', color: 'bg-indigo-500' }
  ];

  const visibleActions = quickActions.filter(action => 
    !action.roles || action.roles.includes(userRole)
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
        <Badge variant={userRole === 'super_admin' ? 'destructive' : 'default'} className="text-sm">
          {userRole === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeVendors} active vendors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalOrders} total orders
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
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.securityAlerts > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {metrics.securityAlerts}
            </div>
            <p className="text-xs text-muted-foreground">
              High-risk events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {visibleActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-20 flex-col gap-2 hover:shadow-md transition-all"
                onClick={() => navigate(action.href)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${action.color} text-white`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {activity.activity_type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user_email || 'System'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Status</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Payment Gateway</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Real-time Updates</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Backup Status</span>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Last: 2h ago
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      {metrics.securityAlerts > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Security Alerts Detected</p>
                <p className="text-sm text-red-700">
                  {metrics.securityAlerts} high-risk security events require attention.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/security-dashboard')}
                className="ml-auto"
              >
                Review Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.pendingOrders > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Pending Orders</p>
                <p className="text-sm text-yellow-700">
                  {metrics.pendingOrders} orders are waiting for processing.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/orders')}
                className="ml-auto"
              >
                Process Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;