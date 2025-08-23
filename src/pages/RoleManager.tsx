import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Shield, AlertTriangle, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RoleManager = () => {
  const { user, profile, userRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<{ [userId: string]: string }>({});

  const roles = [
    { value: 'customer', label: 'Customer', color: 'bg-blue-500' },
    { value: 'vendor', label: 'Vendor', color: 'bg-green-500' },
    { value: 'admin', label: 'Admin', color: 'bg-orange-500' },
    { value: 'super_admin', label: 'Super Admin', color: 'bg-purple-500' }
  ];

  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-users');

      if (error) throw new Error(error.message);

      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: newRole
    }));
  };

  const applyRoleChange = async (userId: string) => {
    const newRole = pendingChanges[userId];
    if (!newRole) return;

    try {
      const { data, error } = await supabase.functions.invoke('update-user-role', {
        body: { userId, newRole }
      });

      if (error) throw new Error(error.message);

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      // Clear pending change
      setPendingChanges(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });

      toast.success('Role updated successfully');
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(`Failed to update role: ${error.message}`);
    }
  };

  const getRoleColor = (role: string) => {
    const roleConfig = roles.find(r => r.value === role);
    return roleConfig?.color || 'bg-gray-500';
  };

  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to manage user roles.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Role Management</h1>
            <p className="text-muted-foreground">
              Manage user roles and permissions across the platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <Badge variant="outline">
              {Object.keys(pendingChanges).length} Pending Changes
            </Badge>
          </div>
        </div>

        {/* Role Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {roles.map(role => {
            const count = users.filter(user => user.role === role.value).length;
            return (
              <Card key={role.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    {role.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">
                    {count === 1 ? 'user' : 'users'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management ({users.length} users)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Change Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getRoleColor(user.role)}`}>
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.company_name && `${user.company_name} • `}
                              Member since {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getRoleColor(user.role)} text-white border-transparent`}
                        >
                          {roles.find(r => r.value === user.role)?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={pendingChanges[user.id] || user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={user.id === profile?.id} // Can't change own role
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles
                              .filter(role => 
                                // Regular admins can't assign super_admin
                                userRole === 'super_admin' || role.value !== 'super_admin'
                              )
                              .map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${role.color}`} />
                                    {role.label}
                                  </div>
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {pendingChanges[user.id] && pendingChanges[user.id] !== user.role && (
                          <Button
                            size="sm"
                            onClick={() => applyRoleChange(user.id)}
                            className="flex items-center gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Apply
                          </Button>
                        )}
                        {user.id === profile?.id && (
                          <Badge variant="outline" className="text-xs">
                            Current User
                          </Badge>
                        )}
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

export default RoleManager;