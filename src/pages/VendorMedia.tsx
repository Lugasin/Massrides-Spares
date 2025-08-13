import React, { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { VendorMediaManager } from "@/components/VendorMediaManager";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Image as ImageIcon } from "lucide-react";

const VendorMedia = () => {
  const { user, profile, userRole } = useAuth();

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Vendor'}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Media Management</h1>
            <p className="text-muted-foreground">Upload and manage your product images and advertisements</p>
          </div>
        </div>
        
        <VendorMediaManager />
      </div>
    </DashboardLayout>
  );
};

export default VendorMedia;
