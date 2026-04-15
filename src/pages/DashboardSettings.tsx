import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Globe } from "lucide-react";

const DashboardSettings = () => {
  const { user, profile, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currencySettings, setCurrencySettings] = useState({
    primary: 'ZMW',
    secondary: 'USD',
    exchange_rate: 28,
    auto_fetch: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'currency')
        .maybeSingle();

      if (!error && data?.value) {
        setCurrencySettings(data.value as any);
      }
      setLoading(false);
    };

    if (userRole === 'super_admin' || userRole === 'admin') {
      fetchSettings();
    } else {
        setLoading(false);
    }
  }, [userRole]);

  const handleSaveCurrency = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'currency',
        value: currencySettings,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      });

    if (error) {
      toast.error("Failed to save settings: " + error.message);
    } else {
      toast.success("Currency settings updated");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Settings</h1>
          <p className="text-muted-foreground">Manage system-wide and account preferences</p>
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            {userRole === 'super_admin' && <TabsTrigger value="system">System (Admin Only)</TabsTrigger>}
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input defaultValue={profile?.full_name || ''} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input defaultValue={user?.email || ''} disabled />
                    </div>
                 </div>
                 <Button variant="outline" onClick={() => navigate('/settings')}>Go to Full Account Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Currency & Exchange Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-fetch">Auto-fetch Exchange Rate</Label>
                    <p className="text-sm text-muted-foreground">Automatically update the exchange rate daily</p>
                  </div>
                  <Switch
                    id="auto-fetch"
                    checked={currencySettings.auto_fetch}
                    onCheckedChange={(checked) => setCurrencySettings({...currencySettings, auto_fetch: checked})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate">Manual Exchange Rate (1 USD = ? ZMW)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="rate"
                        type="number"
                        className="pl-10"
                        value={currencySettings.exchange_rate}
                        onChange={(e) => setCurrencySettings({...currencySettings, exchange_rate: parseFloat(e.target.value)})}
                        disabled={currencySettings.auto_fetch}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveCurrency} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Currency Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSettings;
