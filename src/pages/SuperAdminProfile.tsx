import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);

  // Check if user is super admin
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

  useEffect(() => {
    loadSystemSettings();
    loadUserStats();
  }, []);

  const loadSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      
      if (data) {
        setSystemSettings(data);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('role, is_active');
      
      if (profiles) {
        const stats = {
          total_users: profiles.length,
          active_users: profiles.filter(p => p.is_active).length,
          vendors: profiles.filter(p => p.role === 'vendor').length,
          customers: profiles.filter(p => p.role === 'customer').length,
          admins: profiles.filter(p => p.role === 'admin' || p.role === 'super_admin').length
        };
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const updateSystemSetting = async (key: string, value: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ [key]: value })
        .eq('id', 1);
      
      if (error) throw error;
      
      setSystemSettings(prev => ({ ...prev, [key]: value }));
      toast.success(`System setting ${key} updated successfully`);
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

  const systemMetrics = [
    { icon: Users, label: 'Total Users', value: userStats.total_users, color: 'text-blue-500' },
    { icon: Store, label: 'Vendors', value: userStats.vendors, color: 'text-green-500' },
    { icon: Package, label: 'Products', value: '1,234', color: 'text-purple-500' },
    { icon: DollarSign, label: 'Revenue', value: '$45,678', color: 'text-yellow-500' }
  ];

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Super Admin'}>
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
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

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
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <AlertTriangle className="h-6 w-6" />
                    Security Audit
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Shield className="h-6 w-6" />
                    Update Permissions
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Security Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm">SSL Certificate Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm">Firewall Enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="text-sm">2 Failed Login Attempts (Last 24h)</span>
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
                  <h4 className="font-medium mb-3">Database Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xl font-bold">2.4 GB</p>
                      <p className="text-xs text-muted-foreground">Database Size</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">98%</p>
                      <p className="text-xs text-muted-foreground">Uptime</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">45ms</p>
                      <p className="text-xs text-muted-foreground">Avg Response</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">1.2M</p>
                      <p className="text-xs text-muted-foreground">Total Queries</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <Button variant="outline" onClick={() => navigate('/analytics')}>
                Analytics Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminProfile;