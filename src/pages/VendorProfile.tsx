import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { 
  Store, 
  Package, 
  TrendingUp, 
  DollarSign,
  Star,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VendorProfile: React.FC = () => {
  const { user, profile, userRole } = useAuth();

  if (userRole !== 'vendor') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">

          <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Vendor Access Required</h2>
          <p className="text-muted-foreground">You need vendor privileges to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const vendorStats = [
    { icon: Package, label: 'Products Listed', value: '24', change: '+3 this month' },
    { icon: DollarSign, label: 'Revenue', value: '$12,450', change: '+18% this month' },
    { icon: TrendingUp, label: 'Orders', value: '89', change: '+12 this week' },
    { icon: Star, label: 'Rating', value: '4.8', change: '125 reviews' }
  ];

  const navigate = useNavigate();
  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Vendor'}>
      <div className="space-y-6">
        {/* Vendor Profile Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              Vendor Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Business Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Business Name:</span> {profile?.company_name || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Contact Person:</span> {profile?.full_name || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {profile?.phone || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Address:</span> {profile?.address || 'Not set'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Vendor Status</h3>
                <div className="space-y-2">
                  <Badge variant="default" className="mr-2">Verified Vendor</Badge>
                  <Badge variant="outline" className="mr-2">Active Seller</Badge>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Member since: {new Date(profile?.created_at || '').toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {vendorStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-success">{stat.change}</p>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button className="h-20 flex-col gap-2" onClick={() => navigate('/vendor/inventory')}>
                <Package className="h-6 w-6" />
                Manage Inventory
              </Button>
              <Button className="h-20 flex-col gap-2" onClick={() => navigate('/vendor/add-product')}>
                <Package className="h-6 w-6" />
                Add New Part
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/analytics')}>
                <TrendingUp className="h-6 w-6" />
                View Analytics
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/messages')}>
                <Users className="h-6 w-6" />
                Customer Messages
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Sales Performance Chart</p>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Additional Vendor Actions */}
        <Card>
          <CardHeader>
            <CardTitle>More Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="secondary" onClick={() => navigate('/dashboard/products')}>View All Products</Button>
               <Button variant="secondary" onClick={() => navigate('/analytics')}>Detailed Analytics</Button>
               <Button variant="secondary" onClick={() => navigate('/messages')}>All Messages</Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>

    </DashboardLayout>
  );
};

export default VendorProfile;