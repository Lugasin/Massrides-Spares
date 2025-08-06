import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { 
  User, 
  ShoppingCart, 
  Heart, 
  MessageSquare,
  Package,
  CreditCard,
  MapPin,
  Phone,
  DollarSign
} from 'lucide-react';

const CustomerProfile: React.FC = () => {
  const { user, profile, userRole } = useAuth();

  const customerStats = [
    { icon: ShoppingCart, label: 'Total Orders', value: '12', change: 'Last order: 2 days ago' },
    { icon: DollarSign, label: 'Total Spent', value: '$45,230', change: 'This year' },
    { icon: Heart, label: 'Saved Items', value: '8', change: 'In wishlist' },
    { icon: MessageSquare, label: 'Active Quotes', value: '3', change: 'Pending responses' }
  ];

  const recentOrders = [
    { id: 'ORD-001', date: '2024-01-15', total: '$12,500', status: 'Delivered', items: 'John Deere Tractor' },
    { id: 'ORD-002', date: '2024-01-10', total: '$8,900', status: 'Shipped', items: 'Irrigation System' },
    { id: 'ORD-003', date: '2024-01-05', total: '$3,200', status: 'Processing', items: 'Tractor Parts' }
  ];

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Customer'}>
      <div className="space-y-6">
        {/* Customer Profile Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Customer Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Personal Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {profile?.full_name || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {profile?.phone || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Farm/Company:</span> {profile?.company_name || 'Not set'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Account Status</h3>
                <div className="space-y-2">
                  <Badge variant="default" className="mr-2">Verified Customer</Badge>
                  <Badge variant="outline" className="mr-2">Premium Member</Badge>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Member since: {new Date(profile?.created_at || '').toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {customerStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.items}</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{order.total}</p>
                    <Badge 
                      variant={order.status === 'Delivered' ? 'default' : 
                              order.status === 'Shipped' ? 'secondary' : 'outline'}
                      className="mt-1"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-20 flex-col gap-2">
                <ShoppingCart className="h-6 w-6" />
                Browse Catalog
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <MessageSquare className="h-6 w-6" />
                Request Quote
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Package className="h-6 w-6" />
                Track Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerProfile;