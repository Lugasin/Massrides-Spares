import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserProfile } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Globe,
  CreditCard,
  Shield,
  LogOut,
  Save,
  Package,
  MessageSquare,
  ShoppingCart,
  Store
} from 'lucide-react';
import { Loader2, UserX, RefreshCw } from 'lucide-react';

// Define Zod schema for profile validation
const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zip_code: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  company_name: z.string().optional().or(z.literal('')),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional().or(z.literal(''))
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile: React.FC = () => {
  const { user, profile, loading: authLoading, updateProfile, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'Zambia',
      company_name: '',
      website_url: '',
      bio: ''
    },
  });

  const { register, handleSubmit, formState: { errors, isDirty }, reset, watch } = form;

  // Reset form with profile data when profile loads
  useEffect(() => {
    if (!authLoading && profile) {
      reset({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zip_code: profile.zip_code || '',
        country: profile.country || 'Zambia',
        company_name: profile.company_name || '',
        website_url: profile.website_url || '',
        bio: profile.bio || ''
      });
    }
  }, [profile, authLoading, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);

    // Filter out empty strings and undefined values
    const updates = Object.fromEntries(
      Object.entries(values).filter(([_, value]) => value !== undefined && value !== '')
    ) as Partial<UserProfile>;

    const { error } = await updateProfile(updates);

    if (!error) {
      toast.success('Profile updated successfully!');
    }

    setIsSaving(false);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(`Sign out failed: ${error.message}`);
    } else {
      navigate('/');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Please log in</h2>
            <p className="text-muted-foreground mb-6">You need to be logged in to view your profile.</p>
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading) {
    return (
      <DashboardLayout userRole={userRole as any} userName={user?.email || 'User'}>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold">Loading Profile...</h2>
            <p className="text-muted-foreground">
              Please wait while we fetch your details.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout userRole={userRole as any} userName={user?.email || 'User'}>
        <div className="flex justify-center items-center h-96">
          <div className="text-center max-w-md">
            <UserX className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold">Profile Data Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find your profile data. This can sometimes happen with a new account if things are still being set up. Reloading the page usually fixes it.
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">User Profile</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize">
                      {userRole?.replace('_', ' ')}
                    </Badge>
                    {profile?.is_verified && (
                      <Badge className="bg-success text-success-foreground">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    {...register('full_name')}
                    placeholder="Enter your full name"
                  />
                  {errors.full_name && (
                    <p className="text-red-500 text-sm">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="+260 XXX XXX XXX"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company/Farm Name
                  </Label>
                  <Input
                    id="company_name"
                    type="text"
                    {...register('company_name')}
                    placeholder="Your company or farm name"
                  />
                  {errors.company_name && (
                    <p className="text-red-500 text-sm">{errors.company_name.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      type="text"
                      {...register('address')}
                      placeholder="Enter your street address"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      {...register('city')}
                      placeholder="Enter your city"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm">{errors.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      type="text"
                      {...register('state')}
                      placeholder="Enter your state or province"
                    />
                    {errors.state && (
                      <p className="text-red-500 text-sm">{errors.state.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip_code">ZIP/Postal Code</Label>
                    <Input
                      id="zip_code"
                      type="text"
                      {...register('zip_code')}
                      placeholder="Enter your ZIP or postal code"
                    />
                    {errors.zip_code && (
                      <p className="text-red-500 text-sm">{errors.zip_code.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      type="text"
                      {...register('country')}
                      placeholder="Enter your country"
                    />
                    {errors.country && (
                      <p className="text-red-500 text-sm">{errors.country.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Additional Information
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="website_url" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website URL
                    </Label>
                    <Input
                      id="website_url"
                      type="url"
                      {...register('website_url')}
                      placeholder="https://your-website.com"
                    />
                    {errors.website_url && (
                      <p className="text-red-500 text-sm">{errors.website_url.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      {...register('bio')}
                      placeholder="Tell us about yourself, your farm, or your business..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {watch('bio')?.length || 0}/500 characters
                    </p>
                    {errors.bio && (
                      <p className="text-red-500 text-sm">{errors.bio.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Account Role</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {profile?.role?.replace('_', ' ')}
                      </Badge>
                      {profile?.is_verified && (
                        <Badge className="bg-success text-success-foreground">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <p className="text-sm text-muted-foreground">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-6">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="flex-1 sm:flex-none">
                Back to Dashboard
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary-hover flex-1 sm:flex-none" onClick={() => navigate('/catalog')}>
                Go to Shop
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/orders')} className="flex-1 sm:flex-none">
                Manage Orders
              </Button>
              {(userRole === 'vendor' || userRole === 'admin' || userRole === 'super_admin') && (
                <Button size="sm" className="bg-secondary hover:bg-secondary-hover flex-1 sm:flex-none" onClick={() => navigate('/vendor/inventory')}>
                  Update Inventory
                </Button>
              )}
              {userRole === 'super_admin' && (
                <Button size="sm" className="bg-destructive hover:bg-destructive/90 flex-1 sm:flex-none" onClick={() => navigate('/profile/super-admin')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Super Panel
                </Button>
              )}
              {userRole === 'admin' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/profile/admin')} className="flex-1 sm:flex-none">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              {userRole === 'vendor' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/profile/vendor')} className="flex-1 sm:flex-none">
                  <Store className="h-4 w-4 mr-2" />
                  Vendor Panel
                </Button>
              )}
            </div>

            <Button
              type="submit"
              form="profile-form"
              disabled={!isDirty || isSaving}
              className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>

        {/* Payment Methods Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Payment Methods</h3>
              <p className="text-muted-foreground mb-6">
                Manage your saved payment methods for faster checkout.
              </p>
              <Button
                onClick={() => setShowPaymentSection(true)}
                className="bg-primary hover:bg-primary-hover"
              >
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/orders')}
              >
                <Package className="h-6 w-6" />
                View Orders
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/messages')}
              >
                <MessageSquare className="h-6 w-6" />
                Messages
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/catalog')}
              >
                <ShoppingCart className="h-6 w-6" />
                Browse Parts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;