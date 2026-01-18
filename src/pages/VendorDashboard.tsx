import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Package } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import VendorDashboardContent from '@/components/VendorDashboard';

const VendorDashboard: React.FC = () => {
  const { user, profile, userRole } = useAuth();

  if (userRole !== 'vendor' && userRole !== 'super_admin' && userRole !== 'admin') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Vendor Access Required</h2>
          <p className="text-muted-foreground">You need vendor privileges to access this dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userRole={userRole as any}
      userName={profile?.full_name || user?.email || 'Vendor'}
      showMetrics={false} // Metrics are now inside VendorDashboardContent
    >
      <VendorDashboardContent />
    </DashboardLayout>
  );
};

export default VendorDashboard;