import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Loader2, SlidersHorizontal, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Log {
  id: string;
  created_at: string;
  activity_type: string;
  user_id: string;
  user_profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
  additional_details: any;
  ip_address: string | null;
}

const activityTypes = [
  'user_signup', 'user_login', 'guest_login', 'password_reset', 
  'profile_update', 'order_created', 'payment_processed', 'error_occurred', 
  'unhandled_promise_rejection'
];

const superAdminActivityTypes = [...activityTypes, 'security_event', 'manual_settlement'];

const ActivityLogPage = () => {
  const { userRole, profile } = useAuth();
  const [filters, setFilters] = useState<{
    activityType: string;
    userId: string;
    dateRange?: DateRange;
  }>({
    activityType: '',
    userId: '',
    dateRange: undefined,
  });

  const { data: logs, isLoading, isError, error } = useQuery<Log[], Error>({
    queryKey: ['activityLogs', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-activity-logs', {
        body: {
          activity_type: filters.activityType || undefined,
          user_id: filters.userId || undefined,
          start_date: filters.dateRange?.from?.toISOString(),
          end_date: filters.dateRange?.to?.toISOString(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }
      return data.logs;
    },
    enabled: !!profile && (userRole === 'admin' || userRole === 'super_admin'),
  });

  if (isError) {
    toast.error(`Failed to fetch logs: ${error.message}`);
  }

  const currentActivityTypes = userRole === 'super_admin' ? superAdminActivityTypes : activityTypes;

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || 'Admin'}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SlidersHorizontal /> Filter Activity Logs</CardTitle>
            <CardDescription>Refine the logs by type, user, or date range for a detailed system audit.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={filters.activityType} onValueChange={(value) => setFilters(f => ({ ...f, activityType: value === 'all' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity Types</SelectItem>
                {currentActivityTypes.map(type => (
                  <SelectItem key={type} value={type} className="capitalize">{type.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filter by User ID..."
              value={filters.userId}
              onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))}
            />
            <div className="lg:col-span-2">
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(range) => setFilters(f => ({ ...f, dateRange: range }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity /> System Activity Log</CardTitle>
            <CardDescription>A comprehensive, real-time audit trail of all significant system and user actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  ) : logs && logs.length > 0 ? (
                    logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{format(new Date(log.created_at), 'PPpp')}</TableCell>
                        <TableCell className="font-medium capitalize text-primary">{log.activity_type.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{log.user_profiles?.email || log.user_id || 'System'}</TableCell>
                        <TableCell>{log.ip_address || 'N/A'}</TableCell>
                        <TableCell><pre className="text-xs bg-muted p-2 rounded-md max-w-xs overflow-auto">{JSON.stringify(log.additional_details, null, 2)}</pre></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No logs found for the selected filters.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityLogPage;