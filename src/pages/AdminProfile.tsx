import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import RealTimeMetrics from '@/components/RealTimeMetrics';
import { 
  Shield,
  Users,
  Settings,
  Database,
  Activity,
  Bell,
  Package,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const AdminProfile: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();

  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Admin privileges required to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const adminCapabilities = [
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      action: 'Manage Users',
      route: '/user-management'
    },
    {
      icon: ShoppingCart,
      title: 'Order Operations',
      description: 'Review orders, payment states, and fulfillment progress',
      action: 'View Orders',
      route: '/orders'
    },
    {
      icon: Package,
      title: 'Inventory Control',
      description: 'Manage products, stock levels, and vendor inventory',
      action: 'Manage Products',
      route: '/products-management'
    },
    ...[{ 
      icon: CreditCard,
      title: 'Financial Audits',
      description: 'Track Vesicash payments, reconciliations, and audit trail events',
      action: 'Payment Monitor',
      route: '/payment-monitoring'
    }],
    {
      icon: Activity,
      title: 'Activity Logs',
      description: 'Review user actions, order events, and admin changes',
      action: 'View Activity',
      route: '/activity-log'
    },
    {
      icon: Database,
      title: 'System Health',
      description: 'Inspect platform health, stock alerts, and operational status',
      action: 'System Health',
      route: '/system-health'
    }
  ];

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Admin'}>
      <div className="space-y-6">
        {/* Admin Profile Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Administrator Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Account Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {profile?.full_name || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
                  <p><span className="text-muted-foreground">Role:</span> 
                    <Badge variant="default" className="ml-2 capitalize">
                      {userRole?.replace('_', ' ')}
                    </Badge>
                  </p>
                  <p><span className="text-muted-foreground">Company:</span> {profile?.company_name || 'Massrides Company Limited'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Admin Privileges</h3>
                <div className="space-y-1 text-sm">
                  <Badge variant="outline" className="mr-2">Full System Access</Badge>
                  <Badge variant="outline" className="mr-2">User Management</Badge>
                  <Badge variant="outline" className="mr-2">Product Management</Badge>
                  <Badge variant="outline" className="mr-2">Order Management</Badge>
                  {userRole === 'super_admin' && (
                    <Badge variant="default" className="mr-2">Super Admin</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminCapabilities.map((capability) => (
            <Card key={capability.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <capability.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{capability.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {capability.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(capability.route)}
                    >
                      {capability.action}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live System Status */}
        <Card>
          <CardHeader>
            <CardTitle>Live System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <RealTimeMetrics userRole={userRole as string} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminProfile;
