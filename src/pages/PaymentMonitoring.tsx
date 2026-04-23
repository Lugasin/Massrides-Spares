import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { VesicashPaymentMonitoringView } from '@/components/admin/VesicashPaymentMonitoring';
import { CreditCard } from 'lucide-react';

const PaymentMonitoring = () => {
  const { user, profile, userRole } = useAuth();
  const layoutRole = userRole === 'super_admin' ? 'super_admin' : 'admin';

  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <DashboardLayout userRole={layoutRole} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground">You need admin privileges to access payment monitoring.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={layoutRole} userName={profile?.full_name || user?.email || 'Admin'}>
      <VesicashPaymentMonitoringView />
    </DashboardLayout>
  );
};

export default PaymentMonitoring;
