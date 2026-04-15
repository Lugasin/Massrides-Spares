import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const ActivityLog = () => {
  const { user, profile, userRole } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user_profiles:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error) {
        setLogs(data || []);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Activity Log</h1>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{log.user_profiles?.full_name || 'System'}</div>
                        <div className="text-xs text-muted-foreground">{log.user_profiles?.email || ''}</div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {JSON.stringify(log.metadata)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              No activity logs found
                          </TableCell>
                      </TableRow>
                  )}
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
