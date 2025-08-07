import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserProfile } from '@/context/AuthContext';
import { toast } from 'sonner'; // Assuming you have sonner installed for toasts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';

// Define Zod schema for profile validation
const profileSchema = z.object({
 full_name: z.string().optional(),
 phone: z.string().optional(), // Add more specific phone validation if needed
 address: z.string().optional(),
 company_name: z.string().optional(),
 // Role is not editable by the user, so not included in the editable schema
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile: React.FC = () => {
  const { user, profile, loading: authLoading, updateProfile, userRole } = useAuth();
  const navigate = useNavigate();

  // State for managing form submission loading
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      company_name: profile?.company_name || '',
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = form;

  // Reset form with profile data when profile loads
  useEffect(() => {
    if (!authLoading && profile) {
      reset({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        company_name: profile.company_name || '', // Initialize with empty string for undefined
      });
    }
  }, [profile, authLoading, reset]);


  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true); // Start saving
    // Filter out undefined values before sending to updateProfile
    const updates = Object.fromEntries(
      Object.entries(values).filter(([_, value]) => value !== undefined)
    ) as Partial<UserProfile>;

    const { error } = await updateProfile(updates);
    setIsSaving(false);
  }

  if (!user) {
    // Should ideally be handled by ProtectedRoute, but a fallback
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">User Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
               <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {/* Email is typically managed via Supabase Auth, read-only here */}
                <Input id="email" type="email" value={user.email || ''} disabled readOnly />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  {...register('full_name')}
                />
                {errors.full_name && (<p className="text-red-500 text-sm">{errors.full_name.message}</p>)}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                />
                {errors.phone && (<p className="text-red-500 text-sm">{errors.phone.message}</p>)}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  {...register('address')}
                />
                {errors.address && (<p className="text-red-500 text-sm">{errors.address.message}</p>)}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company/Farm Name</Label>
                <Input
                  id="company_name"
                  type="text"
                  {...register('company_name')}
                />
                {errors.company_name && (<p className="text-red-500 text-sm">{errors.company_name.message}</p>)}
              </div>

              {/* Display Role (Read-only) */}
               <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" type="text" value={profile?.role || 'customer'} disabled readOnly />
              </div>


            </form>
          </CardContent>
          <CardFooter className="flex justify-between pt-4">
            <div className="flex gap-2">
              {user && ( // Show 'Back to Dashboard' for logged-in users
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/catalog')}>
                Shop Now
              </Button>
              {userRole && userRole !== 'guest' && ( // Conditionally render role-specific profile link
                <Button variant="ghost" onClick={() => navigate(`/profile/${userRole}`)}>
                  View {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Profile
                </Button>
              )}
               {!user && localStorage.getItem('guest_session_id') && ( // Show 'Back to Home' for guests
                 <Button variant="outline" onClick={() => navigate('/')}>
                   Back to Home
                 </Button>
               )}
            </div>
            <Button type="submit" form="profile-form" disabled={isSubmitting || isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;