import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, Lock, Home } from 'lucide-react';

// Define a type for our address for better type safety
type Address = { id?: string; address_line_1: string; city: string; province: string; postal_code: string };

const ProfileManagement = () => {
  const { user } = useAuth();
  // Personal Info State
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Address State
  const [shippingAddress, setShippingAddress] = useState<Address>({ address_line_1: '', city: '', province: '', postal_code: '' });
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      setFullName(user.user_metadata.full_name || '');
      setEmail(user.email || '');

      // Fetch existing shipping address
      const { data, error } = await (supabase as any)
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('address_type', 'shipping')
        .single();

      if (data) setShippingAddress(data as Address);
    };

    fetchUserData();
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Profile updated successfully!');      
      // Refresh the session to ensure the AuthContext gets the latest user data.
      // This will trigger the onAuthStateChange listener.
      await supabase.auth.refreshSession();
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  const handleAddressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setAddressLoading(true);
    const { error } = await (supabase as any)
      .from('user_addresses')
      .upsert({
        id: shippingAddress.id, // Pass ID for upsert to work
        user_id: user.id,
        address_type: 'shipping',
        ...shippingAddress
      }, { onConflict: 'id' });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Shipping address updated successfully!');
    }
    setAddressLoading(false);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };

  if (!user) {
    return <div>Please log in to manage your profile.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User /> Personal Information</CardTitle>
          <CardDescription>Update your name and email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <Input id="email" type="email" value={email} disabled className="mt-1 bg-gray-100" />
              <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed.</p>
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock /> Change Password</CardTitle>
          <CardDescription>Choose a new, strong password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="password">New Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <Button type="submit" variant="secondary" disabled={passwordLoading}>
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Home /> Shipping Address</CardTitle>
          <CardDescription>Manage your primary shipping address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddressUpdate} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="address_line_1">Address Line 1</label>
              <Input id="address_line_1" name="address_line_1" value={shippingAddress.address_line_1} onChange={handleAddressChange} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city">City</label>
                <Input id="city" name="city" value={shippingAddress.city} onChange={handleAddressChange} className="mt-1" />
              </div>
              <div>
                <label htmlFor="province">Province</label>
                <Input id="province" name="province" value={shippingAddress.province} onChange={handleAddressChange} className="mt-1" />
              </div>
            </div>
            <div>
              <label htmlFor="postal_code">Postal Code</label>
              <Input id="postal_code" name="postal_code" value={shippingAddress.postal_code} onChange={handleAddressChange} className="mt-1" />
            </div>
            <Button type="submit" variant="secondary" disabled={addressLoading}>
              {addressLoading ? 'Saving Address...' : 'Save Address'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileManagement;