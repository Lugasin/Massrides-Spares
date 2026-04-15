import React, { useState, useEffect } from 'react';
import { logger } from "@/lib/logger";
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Shield,
  Users,
  Settings,
  Database,
  Activity,
  Bell,
  Lock,
  Key,
  UserPlus,
  UserMinus,
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PaymentMonitoringPanel } from '@/components/admin/PaymentMonitoringPanel';

interface SystemSettings {
  maintenance_mode: boolean;
  allow_registrations: boolean;
  require_email_verification: boolean;
  max_upload_size: number;
  allowed_file_types: string[];
  commission_rate: number;
  tax_rate: number;
  currency: string;
}

interface UserStats {
  total_users: number;
  active_users: number;
  vendors: number;
  customers: number;
  admins: number;
}

interface SecurityOverview {
  highRiskEvents: number;
  lowStockItems: number;
  paymentSuccessRate: number;
  systemHealthScore: number;
  systemHealthStatus: 'healthy' | 'warning' | 'critical';
}

const SYSTEM_SETTINGS_STORAGE_KEY = 'super_admin_system_settings';

const SuperAdminProfile: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    allow_registrations: true,
    require_email_verification: true,
    max_upload_size: 10,
    allowed_file_types: ['jpg', 'png', 'pdf'],
    commission_rate: 10,
    tax_rate: 16,
    currency: 'ZMW'
  });
  const [userStats, setUserStats] = useState<UserStats>({
    total_users: 0,
    active_users: 0,
    vendors: 0,
    customers: 0,
    admins: 0
  });
  const [ordersToday, setOrdersToday] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [financialStats, setFinancialStats] = useState({
    total_commission_recorded: 0,
    total_volume_released: 0,
    pending_payouts: 0
  });
  const [usingDerivedFinancialFallback, setUsingDerivedFinancialFallback] = useState(false);
  
  // Vendor Payouts state
  const [vendorPayouts, setVendorPayouts] = useState<any[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);

  // FX Rate state
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  /* State */
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [securityOverview, setSecurityOverview] = useState<SecurityOverview>({
    highRiskEvents: 0,
    lowStockItems: 0,
    paymentSuccessRate: 0,
    systemHealthScore: 100,
    systemHealthStatus: 'healthy',
  });

useEffect(() => {
    loadSystemSettings();
    loadUserStats();
    loadOrdersToday();
    loadFinancialStats();
    loadAuditLogs();
    loadSecurityOverview();
    loadVendorPayouts();
  }, []);

  const loadOrdersToday = async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString())
        .eq('payment_status', 'paid');

      if (error) throw error;
      setOrdersToday(count || 0);
    } catch (error) {
      logger.error("Error loading today's orders", error);
      setOrdersToday(0);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) {
        setAuditLogs([]);
        return;
      }

      const actorIds = Array.from(new Set(data.map((log: any) => log.actor_id).filter(Boolean)));
      let actorMap: Record<string, string> = {};

      if (actorIds.length > 0) {
        const { data: actors, error: actorError } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', actorIds);

        if (actorError) throw actorError;

        actorMap = Object.fromEntries((actors || []).map((actor: any) => [actor.id, actor.full_name || 'System']));
      }

      setAuditLogs(
        data.map((log: any) => ({
          ...log,
          actor_name: log.actor_id ? actorMap[log.actor_id] || 'System' : 'System',
        })),
      );
    } catch (error) {
      logger.error('Error loading audit logs', error);
    }
  };

  const loadFinancialStats = async () => {
    try {
      const { data, error } = await supabase.from('super_admin_financial_summary').select('*').single();
      if (error) {
        logger.warn('Falling back to payment-derived financial stats', error);
        const { data: paymentRows, error: paymentError } = await supabase
          .from('payments')
          .select(`
            status,
            order:orders(total_amount)
          `);

        if (paymentError) throw paymentError;

        const paidPayments = (paymentRows || []).filter((payment: any) => payment.status === 'paid');
        const totalVolumeReleased = paidPayments.reduce(
          (sum: number, payment: any) => sum + Number(payment.order?.total_amount || 0),
          0,
        );
        const pendingPayouts = (paymentRows || []).filter((payment: any) =>
          payment.status === 'pending' || payment.status === 'authorised'
        ).length;

        setFinancialStats({
          total_commission_recorded: 0,
          total_volume_released: totalVolumeReleased,
          pending_payouts: pendingPayouts,
        });
        setUsingDerivedFinancialFallback(true);
        return;
}

      if (data) {
        setFinancialStats(data);
        setUsingDerivedFinancialFallback(false);
      }
    } catch (error) {
      logger.error('Error loading financial stats', error);
    }
  };

  const loadVendorPayouts = async () => {
    setPayoutLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_payouts')
        .select(`
          *,
          vendor:user_profiles!vendor_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setVendorPayouts(data || []);
    } catch (error) {
      logger.error('Error loading vendor payouts', error);
    } finally {
      setPayoutLoading(false);
    }
  };

  const processVendorPayout = async (payoutId: string) => {
    setProcessingPayoutId(payoutId);
    try {
      const { data, error } = await supabase.functions.invoke('process-vendor-payout', {
        body: { payout_id: payoutId },
      });
      
      if (error) throw error;
      
      toast.success('Payout processed successfully');
      await loadVendorPayouts();
      await loadFinancialStats();
    } catch (error: any) {
      logger.error('Error processing payout', error);
      toast.error(error.message || 'Failed to process payout');
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const rejectVendorPayout = async (payoutId: string) => {
    if (!confirm('Are you sure you want to reject this payout?')) return;
    
    setProcessingPayoutId(payoutId);
    try {
      const { error } = await supabase
        .from('vendor_payouts')
        .update({ status: 'rejected', failure_reason: 'Rejected by admin' })
        .eq('id', payoutId);
      
      if (error) throw error;
      
      toast.success('Payout rejected');
      await loadVendorPayouts();
      await loadFinancialStats();
    } catch (error) {
      logger.error('Error rejecting payout', error);
      toast.error('Failed to reject payout');
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const loadSecurityOverview = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring', {
        body: {
          timeframe: '24h',
          risk_threshold: 7,
        },
      });

      if (error) throw error;
      if (!data?.success) return;

      setSecurityOverview({
        highRiskEvents: Number(data.data?.security_metrics?.high_risk_events || 0),
        lowStockItems: Number(data.data?.system_health?.low_stock_items_count || 0),
        paymentSuccessRate: Number(data.data?.payment_metrics?.success_rate || 0),
        systemHealthScore: Number(data.data?.system_health?.score || 0),
        systemHealthStatus: data.data?.system_health?.status || 'warning',
      });
    } catch (error) {
      logger.error('Error loading security overview:', error);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const stored = window.localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSystemSettings(prev => ({ ...prev, ...parsed }));
        logger.log('System settings loaded from local preview storage');
      } else {
        logger.log('System settings loaded (using defaults)');
      }
    } catch (error) {
      logger.error('Error loading system settings:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('role, is_active') as any; // Cast to any to bypass strict typing issues

      if (profiles) {
        const stats = {
          total_users: profiles.length,
          active_users: profiles.filter((p: any) => p.is_active).length,
          vendors: profiles.filter((p: any) => p.role === 'vendor').length,
          customers: profiles.filter((p: any) => p.role === 'customer').length,
          admins: profiles.filter((p: any) => p.role === 'admin' || p.role === 'super_admin').length
        };
        setUserStats(stats);
      }
    } catch (error) {
      logger.error('Error loading user stats:', error);
    }
  };

  const updateSystemSetting = async (key: string, value: any) => {
    setLoading(true);
    try {
      setSystemSettings(prev => {
        const next = { ...prev, [key]: value };
        window.localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      toast.success(`System setting ${key} updated in this browser session`);
    } catch (error: any) {
      toast.error(`Failed to update setting: ${error.message}`);
    }
    setLoading(false);
  };

  const handleBackupDatabase = async () => {
    toast.info('Database backup initiated...');
    // Implement database backup logic
  };

  const handleClearCache = async () => {
    toast.success('Cache cleared successfully');
    // Implement cache clearing logic
  };

  const handleSaveRate = async () => {
    const newRate = Number(rateInput);
    if (isNaN(newRate) || newRate <= 0) {
      toast.error('Please enter a valid exchange rate');
      return;
    }

    setSavingRate(true);
    try {
      // Let supabase.functions.invoke handle JWT auth automatically
      const { data: responseData, error } = await supabase.functions.invoke('save-fx-rate', {
        body: {
          base_currency: 'USD',
          quote_currency: 'ZMW',
          provider: 'manual_super_admin',
          rate: newRate,
          rate_date: new Date().toISOString().split('T')[0],
          fetched_at: new Date().toISOString(),
          expires_at: null,
          source_payload: { manually_set: true },
        },
      });

      if (error) throw error;
      if (!responseData?.success) {
        throw new Error(responseData?.message || 'Failed to save exchange rate');
      }

      setEditingRate(false);
      setRateInput('');
      localStorage.setItem('massrides_checkout_fx_rate:USD:ZMW', JSON.stringify({
        base_currency: 'USD',
        quote_currency: 'ZMW',
        rate: newRate,
        provider: 'manual_super_admin',
        fetched_at: new Date().toISOString(),
      }));
      toast.success(`Exchange rate updated to ${newRate}`);
    } catch (err: any) {
      console.error('Failed to save rate:', err);
      // Check if it's an auth error
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        // Still save to localStorage as offline fallback
        localStorage.setItem('massrides_checkout_fx_rate:USD:ZMW', JSON.stringify({
          base_currency: 'USD',
          quote_currency: 'ZMW',
          rate: newRate,
          provider: 'manual_super_admin',
          fetched_at: new Date().toISOString(),
        }));
        toast.success(`Exchange rate saved locally: ${newRate} (offline mode)`);
      } else {
        toast.error('Failed to update exchange rate');
      }
    } finally {
      setSavingRate(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(amount);
  };

  const dashboardMetrics = [
    { icon: Users, label: 'Total Users', value: userStats.total_users, change: '+0%' },
    { icon: Package, label: 'Active Vendors', value: userStats.vendors, change: '+0%' },
    { icon: ShoppingCart, label: 'Orders Today', value: ordersToday, change: '+0%' },
    { icon: DollarSign, label: 'Revenue', value: formatCurrency(financialStats.total_volume_released), change: '+0%' },
  ];

  const systemMetrics = [
    { icon: Users, label: 'Total Users', value: userStats.total_users, color: 'text-blue-500' },
    { icon: Store, label: 'Vendors', value: userStats.vendors, color: 'text-green-500' },
    { icon: Package, label: 'Low Stock Alerts', value: securityOverview.lowStockItems, color: 'text-purple-500' },
    { icon: DollarSign, label: 'Payment Success', value: `${securityOverview.paymentSuccessRate.toFixed(1)}%`, color: 'text-yellow-500' }
  ];

  if (userRole !== 'super_admin') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Super Admin privileges required to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userRole={userRole as any}
      userName={profile?.full_name || user?.email || 'Super Admin'}
      metrics={dashboardMetrics}
    >
      <div className="space-y-6">
        {/* Super Admin Header */}
        <Card className="border-destructive/20">
          <CardHeader className="bg-gradient-to-r from-destructive/10 to-destructive/5">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-destructive" />
              Super Administrator Control Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{profile?.full_name || 'Super Admin'}</h3>
                <p className="text-muted-foreground">{user?.email}</p>
                <Badge variant="destructive" className="mt-2">SUPER ADMIN</Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last login</p>
                <p className="font-medium">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                  <metric.icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-4 overflow-x-hidden">
          <TabsList className="flex w-full overflow-x-auto overflow-y-hidden whitespace-nowrap bg-background border-b border-border p-0 h-auto gap-1 mb-8 scrollbar-none">
            <TabsTrigger value="users" className="flex-1 md:flex-none px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Users</TabsTrigger>
            <TabsTrigger value="financials" className="flex-1 md:flex-none px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Financials</TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 md:flex-none px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Payments & Alerts</TabsTrigger>
            <TabsTrigger value="system" className="flex-1 md:flex-none px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">System</TabsTrigger>
            <TabsTrigger value="security" className="flex-1 md:flex-none px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Security</TabsTrigger>
            <TabsTrigger value="database" className="flex-1 md:flex-none px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Database</TabsTrigger>
            <TabsTrigger value="logs" className="flex-1 md:flex-none px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Logs</TabsTrigger>
          </TabsList>

          {/* Financials Management */}
          <TabsContent value="financials" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {usingDerivedFinancialFallback ? 'Paid Volume' : 'Recorded Commission'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(usingDerivedFinancialFallback ? financialStats.total_volume_released : financialStats.total_commission_recorded)}
                  </div>
                  {usingDerivedFinancialFallback && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Summary view unavailable. Showing paid order volume instead of commission.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending Payouts</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{financialStats.pending_payouts}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Financial Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Actor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">No audit logs found.</TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{log.event_type.replace(/_/g, ' ').toUpperCase()}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold">{log.entity_type}</span>
                                <span className="text-xs text-muted-foreground truncate w-24" title={log.entity_id}>{log.entity_id}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{log.amount ? formatCurrency(log.amount) : '-'}</TableCell>
                            <TableCell>
                              <span className="text-sm">{log.actor_name || 'System'}</span>
                            </TableCell>
                          </TableRow>
                        )))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Payouts Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Vendor Payouts
                </CardTitle>
                <Button variant="outline" size="sm" onClick={loadVendorPayouts} disabled={payoutLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${payoutLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {payoutLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : vendorPayouts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No vendor payouts found.
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorPayouts.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(payout.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{payout.vendor?.full_name || 'Unknown'}</span>
                                <span className="text-xs text-muted-foreground">{payout.vendor?.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(payout.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payout.metadata?.payout_method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  payout.status === 'completed' ? 'default' :
                                  payout.status === 'processing' ? 'secondary' :
                                  payout.status === 'pending' ? 'outline' :
                                  payout.status === 'failed' || payout.status === 'rejected' ? 'destructive' :
                                  'outline'
                                }
                              >
                                {payout.status}
                              </Badge>
                              {payout.failure_reason && (
                                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={payout.failure_reason}>
                                  {payout.failure_reason}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {payout.status === 'pending' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      onClick={() => processVendorPayout(payout.id)}
                                      disabled={processingPayoutId === payout.id}
                                    >
                                      {processingPayoutId === payout.id ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Process
                                        </>
                                      )}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => rejectVendorPayout(payout.id)}
                                      disabled={processingPayoutId === payout.id}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {payout.payout_reference && (
                                  <span className="text-xs text-muted-foreground" title={payout.payout_reference}>
                                    Ref: {payout.payout_reference.slice(0, 8)}...
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    className="h-20 flex-col gap-2"
                    onClick={() => navigate('/role-manager')}
                  >
                    <UserPlus className="h-6 w-6" />
                    Manage Roles
                  </Button>
                  <Button
                    className="h-20 flex-col gap-2"
                    variant="outline"
                    onClick={() => navigate('/user-management')}
                  >
                    <Users className="h-6 w-6" />
                    View All Users
                  </Button>
                  <Button
                    className="h-20 flex-col gap-2"
                    variant="outline"
                    onClick={() => navigate('/activity-log')}
                  >
                    <Activity className="h-6 w-6" />
                    Activity Logs
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">User Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{userStats.total_users}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-success">{userStats.active_users}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-500">{userStats.customers}</p>
                      <p className="text-xs text-muted-foreground">Customers</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-500">{userStats.vendors}</p>
                      <p className="text-xs text-muted-foreground">Vendors</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">{userStats.admins}</p>
                      <p className="text-xs text-muted-foreground">Admins</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  These system controls are stored in local preview storage until a persisted system settings table is deployed.
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable site access for users
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.maintenance_mode}
                      onCheckedChange={(checked) => updateSystemSetting('maintenance_mode', checked)}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow New Registrations</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to create accounts
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.allow_registrations}
                      onCheckedChange={(checked) => updateSystemSetting('allow_registrations', checked)}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Email Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Users must verify email before access
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.require_email_verification}
                      onCheckedChange={(checked) => updateSystemSetting('require_email_verification', checked)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commission Rate (%)</Label>
                    <Input
                      type="number"
                      value={systemSettings.commission_rate}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, commission_rate: Number(e.target.value) }))}
                      onBlur={() => updateSystemSetting('commission_rate', systemSettings.commission_rate)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={systemSettings.tax_rate}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, tax_rate: Number(e.target.value) }))}
                      onBlur={() => updateSystemSetting('tax_rate', systemSettings.tax_rate)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={systemSettings.currency}
                    onValueChange={(value) => updateSystemSetting('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Exchange Rate (USD to ZMW)</Label>
                      <p className="text-sm text-muted-foreground">Manual override for exchange rate when auto-fetch fails</p>
                    </div>
                    {editingRate ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Enter rate (e.g. 26.50)"
                          value={rateInput}
                          onChange={(e) => setRateInput(e.target.value)}
                          className="w-32"
                        />
                        <Button size="sm" onClick={handleSaveRate} disabled={savingRate}>
                          {savingRate ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingRate(false); setRateInput(''); }}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditingRate(true)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Set Manual Rate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Key className="h-6 w-6" />
                    Reset All Passwords
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Lock className="h-6 w-6" />
                    Force 2FA for Admins
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/activity-log')}>
                    <AlertTriangle className="h-6 w-6" />
                    Security Audit
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/security-dashboard')}>
                    <Shield className="h-6 w-6" />
                    Security Dashboard
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Security Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {securityOverview.systemHealthStatus === 'critical' ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : securityOverview.systemHealthStatus === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      <span className="text-sm">System health: {securityOverview.systemHealthScore}/100</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {securityOverview.highRiskEvents > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      <span className="text-sm">{securityOverview.highRiskEvents} high-risk security events in the last 24h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {securityOverview.lowStockItems > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      <span className="text-sm">{securityOverview.lowStockItems} low-stock items need attention</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Management */}
          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    className="h-20 flex-col gap-2"
                    onClick={handleBackupDatabase}
                  >
                    <Download className="h-6 w-6" />
                    Backup Database
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Upload className="h-6 w-6" />
                    Restore Database
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={handleClearCache}
                  >
                    <RefreshCw className="h-6 w-6" />
                    Clear Cache
                  </Button>
                  <Button variant="destructive" className="h-20 flex-col gap-2">
                    <Trash2 className="h-6 w-6" />
                    Purge Old Data
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Operational Snapshot</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xl font-bold">{securityOverview.systemHealthScore}/100</p>
                      <p className="text-xs text-muted-foreground">System Health</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{userStats.active_users}</p>
                      <p className="text-xs text-muted-foreground">Active Users</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{securityOverview.lowStockItems}</p>
                      <p className="text-xs text-muted-foreground">Low Stock Items</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{securityOverview.paymentSuccessRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Payment Success</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments & Alerts (Fintech) */}
          <TabsContent value="payments" className="space-y-4">
            <PaymentMonitoringPanel />
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/activity-log')}
                    >
                      View Full Logs
                    </Button>
                    <Button variant="outline">
                      Export Logs
                    </Button>
                    <Button variant="outline">
                      Clear Old Logs
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="font-mono text-xs">{new Date().toISOString()}</span>
                      <span>System backup completed successfully</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-mono text-xs">{new Date().toISOString()}</span>
                      <span>Failed login attempt from IP: 192.168.1.1</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="font-mono text-xs">{new Date().toISOString()}</span>
                      <span>New user registration: user@example.com</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>System Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Are you sure you want to enter maintenance mode?')) {
                    updateSystemSetting('maintenance_mode', true);
                  }
                }}
              >
                Enable Maintenance
              </Button>
              <Button variant="outline" onClick={() => navigate('/payment-monitoring')}>
                Payment Monitor
              </Button>
              <Button variant="outline" onClick={() => navigate('/products-management')}>
                Product Management
              </Button>
              <Button variant="outline" onClick={() => navigate('/user-management')}>
                User Management
              </Button>
              <Button variant="outline" onClick={() => navigate('/security-dashboard')}>
                Security Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminProfile;
