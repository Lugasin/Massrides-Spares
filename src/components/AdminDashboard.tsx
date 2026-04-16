import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Activity,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  Settings
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';

const AdminDashboard: React.FC = () => {
  const { userRole, profile, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const { formatPrice } = useCurrency();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: res, error } = await supabase.functions.invoke('get-admin-dashboard-data');
      if (error) throw error;
      setData(res);
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-6 text-center">Loading admin dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data?.metrics?.map((metric: any, index: number) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className={`text-xs ${metric.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Amount (ZMW)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.recentPayments?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.order?.order_number}</TableCell>
                    <TableCell>{formatPrice(p.amount_zmw)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.recentPayments || data.recentPayments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No recent payments.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/user-management')}>
              <Users className="h-6 w-6" />
              Manage Users
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/payment-monitoring')}>
              <DollarSign className="h-6 w-6" />
              Monitor Payments
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/activity-log')}>
              <Activity className="h-6 w-6" />
              System Logs
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/settings')}>
              <Settings className="h-6 w-6" />
              System Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
