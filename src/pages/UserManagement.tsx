import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';

const UserManagement: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  // Use consistent role enum with Supabase definition
  const roles: UserProfile['role'][] = ['super_admin', 'admin', 'vendor', 'customer'];

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<{ [userId: string]: UserProfile['role'] }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-users');

      if (error) {
        console.error('Error fetching user profiles:', error);
        toast.error(`Failed to fetch users: ${error.message}`);
      } else {
        setUsers((data?.users as UserProfile[]) || []);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: UserProfile['role']) => {
    toast.info(`Updating role for user ${userId}...`);

    try {
      const { error } = await supabase.functions.invoke('update-user-role', {
        body: { userId, newRole }
      });

      if (error) throw error;

      // Optimistically update UI
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));

      // Clear the pending change for this user after successful update
      setPendingRoleChanges(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });

      toast.success(`Role updated successfully for user ${userId}!`);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(`Failed to update role: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Admin'}>
        <div className="container mx-auto px-4 py-8">Loading users...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Admin'}>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">User Management</CardTitle>
            <p className="text-muted-foreground">
              Manage user roles and permissions. To add a new vendor or admin, wait for them to register, then upgrade their role in the list below.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((managedUser) => {
                    const isCurrentUser = managedUser.user_id === user?.id;

                    return (
                      <TableRow key={managedUser.id}>
                        <TableCell>{managedUser.full_name || 'N/A'}</TableCell>
                        <TableCell>{managedUser.email}</TableCell>
                        <TableCell>{managedUser.role}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <select
                            value={pendingRoleChanges[managedUser.id] || managedUser.role}
                            onChange={(e) => {
                              setPendingRoleChanges(prev => ({
                                ...prev,
                                [managedUser.id]: e.target.value as UserProfile['role']
                              }));
                            }}
                            disabled={isCurrentUser}
                            className="block w-fit px-2 py-1 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          >
                            {roles
                              .filter((roleOption) => userRole === 'super_admin' || roleOption !== 'super_admin')
                              .map((roleOption) => (
                                <option key={roleOption} value={roleOption}>
                                  {roleOption}
                                </option>
                              ))}
                          </select>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (pendingRoleChanges[managedUser.id]) {
                                handleUpdateRole(managedUser.id, pendingRoleChanges[managedUser.id]);
                              }
                            }}
                            disabled={isCurrentUser || !pendingRoleChanges[managedUser.id] || pendingRoleChanges[managedUser.id] === managedUser.role}
                          >
                            Update Role
                          </Button>
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground">Current user</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {users.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No users found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
