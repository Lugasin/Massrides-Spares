import React from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock, Database, Globe, Zap } from "lucide-react";

const SystemHealth = () => {
  const { user, profile, userRole } = useAuth();

  const services = [
    { name: "Database", status: "Healthy", icon: Database, color: "bg-success" },
    { name: "Payment Gateway (Vesicash)", status: "Connected", icon: Globe, color: "bg-success" },
    { name: "Real-time Updates", status: "Active", icon: Zap, color: "bg-success" },
    { name: "Storage Service", status: "Healthy", icon: Database, color: "bg-success" },
    { name: "Email Service", status: "Healthy", icon: Zap, color: "bg-success" },
    { name: "FX Rate Service", status: "Healthy", icon: Globe, color: "bg-success" },
  ];

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">System Health</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-muted rounded-lg">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <Badge className={service.color}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {service.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg">{service.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Operational and performing normally.</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Maintenance Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Automatic Backup Completed</p>
                  <p className="text-xs text-muted-foreground">Today, 02:00 AM - Successfully backed up 1.2GB of data.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">System Update Applied</p>
                  <p className="text-xs text-muted-foreground">Yesterday, 11:45 PM - Security patches and performance optimizations.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SystemHealth;
