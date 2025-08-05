import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { 
  Shield, 
  Users, 
  Settings, 
  Database,
  Activity,
  Bell
} from 'lucide-react';

const AdminProfile: React.FC = () => {
  const { user, profile, userRole } = useAuth();

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
      action: 'Manage Users'
    },
    {
      icon: Database,
      title: 'System Configuration',
      description: 'Configure system settings and parameters',
      action: 'System Settings'
    },
    {
      icon: Activity,
      title: 'Analytics & Reports',
      description: 'View detailed analytics and generate reports',
      action: 'View Analytics'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Manage system notifications and alerts',
      action: 'Notifications'
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
                    <Button variant="outline" size="sm">
                      {capability.action}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success">99.9%</div>
                <div className="text-sm text-muted-foreground">System Uptime</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">1,234</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <div className="text-2xl font-bold text-secondary">567</div>
                <div className="text-sm text-muted-foreground">Products Listed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminProfile;