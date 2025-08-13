import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Activity, 
  Search, 
  Filter, 
  Download,
  User,
  ShoppingCart,
  CreditCard,
  Settings,
  LogIn,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  action_details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string;
  };
}

const ActivityLog = () => {
  const { user, profile, userRole } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      fetchActivityLogs();
      subscribeToLogs();
    } else if (user) {
      fetchUserActivityLogs();
    }
  }, [user, userRole]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user_profile:user_profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivityLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching user activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLogs = () => {
    const channel = supabase
      .channel('activity-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        () => {
          if (userRole === 'admin' || userRole === 'super_admin') {
            fetchActivityLogs();
          } else {
            fetchUserActivityLogs();
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'login':
      case 'signup':
        return <LogIn className="h-4 w-4 text-green-500" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-red-500" />;
      case 'order_created':
      case 'order_updated':
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case 'payment_processed':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'profile_updated':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'settings_updated':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'login':
      case 'signup':
      case 'payment_processed':
        return 'default';
      case 'logout':
        return 'destructive';
      case 'order_created':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const actionTypes = Array.from(new Set(logs.map(log => log.action_type)));

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Activity Log</h1>
              <p className="text-muted-foreground">
                {userRole === 'admin' || userRole === 'super_admin' 
                  ? 'System-wide activity monitoring' 
                  : 'Your account activity history'}
              </p>
            </div>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activity..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="all">All Actions</option>
                  {actionTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading activity logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No activity found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || actionFilter !== 'all' 
                    ? 'Try adjusting your search or filters.' 
                    : 'Activity will appear here as actions are performed.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                      <TableHead>User</TableHead>
                    )}
                    <TableHead>Details</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action_type)}
                          <Badge variant={getActionColor(log.action_type)} className="capitalize">
                            {log.action_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      {(userRole === 'admin' || userRole === 'super_admin') && (
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {log.user_profile?.full_name || 'Guest User'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {log.user_profile?.email || 'No email'}
                            </p>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="max-w-xs">
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {JSON.stringify(log.action_details, null, 2)}
                          </pre>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityLog;