import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const GuestCheckoutForm = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const handleGuestCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      toast.error("Please enter your full name and email to proceed.");
      return;
    }

    setLoading(true);
    toast.info("Sending a secure login link to your email...");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // IMPORTANT: This URL should point to your payment confirmation page.
        // The user will be redirected here after clicking the magic link.
        emailRedirectTo: `${window.location.origin}/checkout/confirm`,
        data: {
          role: 'customer',
          full_name: fullName,
        },
      },
    });

    setLoading(false);
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
        <form onSubmit={handleGuestCheckout} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., John Doe"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending Link...' : 'Proceed to Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GuestCheckoutForm;