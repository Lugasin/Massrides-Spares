import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const PaymentMethods: React.FC = () => {
  const { user, profile, userRole } = useAuth();

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Payment Methods</h1>
              <p className="text-muted-foreground">Manage your saved payment methods</p>
            </div>
          </div>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-blue-800 mb-2">Secure Payments with Vesicash</h3>
            <p className="text-blue-700 max-w-md mx-auto">
              We are currently upgrading our payment systems to provide a more secure experience with Vesicash.
              Saved payment methods will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentMethods;