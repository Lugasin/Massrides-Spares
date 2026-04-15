import React from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Lock, UserX, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SecurityDashboard = () => {
  const { user, profile, userRole } = useAuth();

  const securityMetrics = [
    { label: "Failed Login Attempts", value: "0", icon: UserX, color: "text-green-500" },
    { label: "High Risk Events", value: "0", icon: AlertTriangle, color: "text-green-500" },
    { label: "Active Sessions", value: "1", icon: Eye, color: "text-blue-500" },
    { label: "Security Score", value: "98%", icon: Shield, color: "text-success" },
  ];

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {securityMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Recent Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No security events detected in the last 24 hours.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SecurityDashboard;
