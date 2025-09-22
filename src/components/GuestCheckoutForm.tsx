import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const guestCheckoutSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
});

type GuestCheckoutFormValues = z.infer<typeof guestCheckoutSchema>;

const GuestCheckoutForm = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<GuestCheckoutFormValues>({
    resolver: zodResolver(guestCheckoutSchema),
  });

  const handleGuestCheckout = async (data: GuestCheckoutFormValues) => {
    toast.info("Sending a secure login link to your email...");

    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        shouldCreateUser: true,
        // IMPORTANT: This URL should point to your payment confirmation page.
        // The user will be redirected here after clicking the magic link.
        emailRedirectTo: `${window.location.origin}/checkout/confirm`,
        data: {
          role: 'customer',
          full_name: data.fullName,
        },
      },
    });

    if (error) {
      toast.error(`Authentication failed: ${error.message}`);
    } else {
      toast.success("Secure link sent! Please check your email to complete your purchase.");
      // You might want to disable the form or show a "Check your email" message here.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest Checkout</CardTitle>
        <CardDescription>
          An account will be created for you automatically. Check your email for a secure link to complete your purchase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleGuestCheckout)} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              {...register('fullName')}
              placeholder="e.g., John Doe"
              className="mt-1"
            />
            {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className="mt-1"
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Sending Link...' : 'Proceed to Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GuestCheckoutForm;