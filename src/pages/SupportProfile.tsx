import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Ticket, Headphones, Package, RefreshCw, ShieldCheck } from 'lucide-react';

const SupportProfile = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Support'}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-6 w-6 text-primary" />
              Support Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Support Agent Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {profile?.full_name || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {user?.email || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Role:</span> <Badge className="ml-2 capitalize">{userRole?.replace('_', ' ')}</Badge></p>
                  <p><span className="text-muted-foreground">Phone:</span> {profile?.phone || 'Not set'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Support Scope</h3>
                <div className="space-y-2 text-sm">
                  <p>Manage customer escalations, track order issues, and respond to product inquiries.</p>
                  <p className="text-muted-foreground">
                    Support access is connected to live orders, messages, and the activity log.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-20 flex-col gap-2" onClick={() => navigate('/messages')}>
                <MessageSquare className="h-6 w-6" />
                Messages
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/orders')}>
                <Ticket className="h-6 w-6" />
                Order Issues
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/activity-log')}>
                <RefreshCw className="h-6 w-6" />
                Activity Log
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Operational note</h3>
                <p className="text-sm text-muted-foreground">
                  Support pages now show live navigation and profile details instead of the unfinished placeholder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" onClick={() => navigate('/orders')}>
                <Package className="mr-2 h-4 w-4" />
                Orders
              </Button>
              <Button variant="outline" onClick={() => navigate('/messages')}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Inbox
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SupportProfile;
