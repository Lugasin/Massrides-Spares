import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const UserManagement: React.FC = () => {
  // Use consistent role enum with Supabase definition
  const roles: UserProfile['role'][] = ['super_admin', 'admin', 'vendor', 'customer'];

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<{ [userId: string]: UserProfile['role'] }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true); // This is already set at the top, but it's fine.
      const { data: usersData, error } = await (supabase as any).from('user_profiles').select('*');

      if (error) {
        console.error('Error fetching user profiles:', error);
        toast.error(`Failed to fetch users: ${error.message}`);
      } else {
        setUsers(usersData || []);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: UserProfile['role']) => {
    toast.info(`Updating role for user ${userId}...`);

    try {
      const { error } = await (supabase as any).from('user_profiles').update({ role: newRole }).eq('id', userId);

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
    return <div className="container mx-auto px-4 py-8">Loading users...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">User Management</CardTitle>
        </CardHeader>
        <CardContent>
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
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <select
                      value={pendingRoleChanges[user.id] || user.role}
                      onChange={(e) => {
                        setPendingRoleChanges(prev => ({
                          ...prev,
                          [user.id]: e.target.value as UserProfile['role']
                        }));
                      }}
                      className="block w-fit px-2 py-1 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                      {roles.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (pendingRoleChanges[user.id]) {
                          handleUpdateRole(user.id, pendingRoleChanges[user.id]);
                        }
                      }}
                      disabled={!pendingRoleChanges[user.id] || pendingRoleChanges[user.id] === user.role}
                    >
                      Update Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No users found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;