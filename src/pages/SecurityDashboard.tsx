import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Package,
  Edit,
  UserX
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SecurityAlert {
  id: string;
  event_type: string;
  risk_score: number;
  blocked: boolean;
  created_at: string;
  metadata: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface SecurityMetrics {
  total_events: number;
  high_risk_events: number;
  blocked_events: number;
  event_types: Record<string, number>;
  risk_distribution: Record<string, number>;
  latest_events: any[];
}

interface PaymentMetrics {
  requests_total: number;
  sessions_created: number;
  success_rate: number;
  recent_activity: any[];
  problematic_payments?: {
    id: string;
    order_number: string;
    customer_email: string;
    amount: number;
    status: string;
    created_at: string;
  }[];
}

interface SystemHealth {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  metrics: any;
  uptime_percentage: number;
  last_incident: string | null;
  low_stock_items_count?: number;
  low_stock_items?: {
    id: string;
    name: string;
    vendor_name: string;
    stock_quantity: number;
    min_stock_level: number;
  }[];
}

const SecurityDashboard = () => {
  const { user, profile, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [paymentMetrics, setPaymentMetrics] = useState<PaymentMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    if (userRole === 'super_admin') {
      fetchSecurityData();
      const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [userRole, timeframe]);

  const fetchSecurityData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring', {
        body: { 
          timeframe,
          risk_threshold: 7
        }
      });

      if (error) throw error;

      if (data?.success) {
        setSecurityMetrics(data.data.security_metrics);
        setAlerts(data.data.alerts);
        setPaymentMetrics(data.data.payment_metrics);
        setSystemHealth(data.data.system_health);
      }
    } catch (error: any) {
      console.error('Failed to fetch security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (userRole !== 'super_admin') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Super Admin Access Required</h2>
          <p className="text-muted-foreground">You need super admin privileges to access the security dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Super Admin'}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Security Dashboard</h1>
              <p className="text-muted-foreground">Comprehensive security monitoring and threat detection</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchSecurityData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth?.score || 0}%</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusColor(systemHealth?.status || 'warning')}>
                  {systemHealth?.status || 'Loading...'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {systemHealth?.low_stock_items_count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Items needing reorder
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityMetrics?.total_events || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {securityMetrics?.high_risk_events || 0} high-risk events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentMetrics?.success_rate?.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                {paymentMetrics?.sessions_created || 0} successful sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {alerts.filter(a => a.severity === 'critical').length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {alerts.filter(a => a.blocked).length} blocked threats
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
            <TabsTrigger value="metrics">Security Metrics</TabsTrigger>
            <TabsTrigger value="payments">Payment Monitoring</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Control</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading security alerts...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(alert.severity)}
                              <Badge variant={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{alert.event_type}</p>
                              <p className="text-sm text-muted-foreground">{alert.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={alert.risk_score >= 8 ? 'destructive' : alert.risk_score >= 6 ? 'secondary' : 'outline'}>
                              {alert.risk_score}/10
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {alert.blocked ? (
                              <Badge variant="destructive">Blocked</Badge>
                            ) : (
                              <Badge variant="outline">Allowed</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast.info(`Blocking user associated with event ${alert.id}`)}>
                                <UserX className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => toast.warning(`Initiating high-priority investigation for ${alert.id}`)}>
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {securityMetrics?.event_types && Object.entries(securityMetrics.event_types).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm">{type.replace(/_/g, ' ').toLowerCase()}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {securityMetrics?.risk_distribution && Object.entries(securityMetrics.risk_distribution).map(([range, count]) => (
                      <div key={range} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{range} Risk</span>
                        <Badge variant={getSeverityColor(range)}>{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment System Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{paymentMetrics?.requests_total || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{paymentMetrics?.sessions_created || 0}</div>
                    <div className="text-sm text-muted-foreground">Sessions Created</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{paymentMetrics?.success_rate?.toFixed(1) || 0}%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
                <h4 className="font-medium mt-6 mb-4">Problematic Payments</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMetrics?.problematic_payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.order_number}</TableCell>
                        <TableCell>{payment.customer_email}</TableCell>
                        <TableCell>${payment.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => toast.info(`Retrying payment for ${payment.order_number}`)}>Retry</Button>
                            <Button variant="destructive" size="sm" onClick={() => toast.error(`Refunding payment for ${payment.order_number}`)}>Refund</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!paymentMetrics?.problematic_payments || paymentMetrics.problematic_payments.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No problematic payments found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Inventory</CardTitle>
                <CardDescription>Products across all vendors that are below their minimum stock level.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Min. Level</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemHealth?.low_stock_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.vendor_name}</TableCell>
                        <TableCell className="text-destructive font-bold">{item.stock_quantity}</TableCell>
                        <TableCell>{item.min_stock_level}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => toast.info(`Notifying ${item.vendor_name} about low stock.`)}>Notify Vendor</Button>
                            <Button variant="secondary" size="sm" onClick={() => toast.info(`Opening stock adjustment for ${item.name}`)}>Adjust Stock</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!systemHealth?.low_stock_items || systemHealth.low_stock_items.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No low stock items found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Health Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground">Overall Health Score</div>
                        <div className="text-2xl font-bold">{systemHealth?.score || 0}/100</div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusColor(systemHealth?.status || 'warning')}>
                          {systemHealth?.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground">Uptime</div>
                        <div className="text-xl font-bold">{systemHealth?.uptime_percentage || 99.9}%</div>
                      </div>
                      <Zap className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        System monitoring metrics would be displayed here in a production environment.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SecurityDashboard;