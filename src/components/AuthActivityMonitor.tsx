import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, UserPlus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Define the type for an activity log entry
type ActivityLog = {
  id: string;
  created_at: string;
  action: string;
  user_id: string | null;
  metadata: {
    email?: string;
    provider?: string;
  };
};

// Fetch initial logs using TanStack Query
const fetchActivityLogs = async () => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('action', 'signup')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data as ActivityLog[];
};

const AuthActivityMonitor = () => {
  const queryClient = useQueryClient();
  const { data: logs, isLoading } = useQuery({
    queryKey: ['authActivityLogs'],
    queryFn: fetchActivityLogs,
  });

  useEffect(() => {
    // Listen to new inserts in the 'activity_logs' table
    const channel = supabase
      .channel('auth-activity-log-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: 'action=eq.signup' },
        (payload) => {
          const newLog = payload.new as ActivityLog;
          
          // Show a real-time notification toast
          toast.info(`New User Signup: ${newLog.metadata?.email || 'Unknown'}`, {
            icon: <UserPlus className="h-4 w-4" />,
          });

          // Invalidate and refetch the query to update the list with the new data
          queryClient.invalidateQueries({ queryKey: ['authActivityLogs'] });
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell /> Real-time Authentication Logs</CardTitle>
        <CardDescription>Monitoring new user signups across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (<p>Loading activity logs...</p>) : (
          <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {logs?.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-2 rounded-full"><UserPlus className="h-5 w-5" /></div>
                  <div>
                    <p className="font-medium text-sm">New Signup: <span className="font-mono text-primary">{log.metadata?.email || 'N/A'}</span></p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{log.metadata?.provider || 'email'}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthActivityMonitor;
