import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette, 
  Globe,
  Save,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  order_updates: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

const Settings = () => {
  const { user, profile, userRole, signOut } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserSettings();
      subscribeToSettings();
    }
  }, [user]);

  const fetchUserSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-user-settings');

      if (error) {
        throw new Error(error.message);
      }

      if (data.settings) {
        setSettings(data.settings);
      } else {
        // If no settings exist, create them
        const { data: newSettingsData, error: createError } = await supabase.functions.invoke('update-user-settings', {
          body: {
            email_notifications: true,
            push_notifications: true,
            marketing_emails: false,
            order_updates: true,
            theme: 'system',
            language: 'en',
            currency: 'USD',
            timezone: 'Africa/Lusaka'
          }
        });

        if (createError) throw new Error(createError.message);
        setSettings(newSettingsData.settings);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error(`Failed to load settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToSettings = () => {
    const channel = supabase
      .channel('user-settings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${profile?.id}`
        },
        (payload) => {
          setSettings(payload.new as UserSettings);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!settings) return;

    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke('update-user-settings', {
        body: { [key]: value }
      });

      if (error) throw new Error(error.message);

      setSettings(data.settings);
      toast.success('Setting updated successfully');
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast.error(`Failed to update setting: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
// Log the account deletion
      await supabase.from('activity_logs').insert({
        user_id: profile?.user_id,
        activity_type: 'account_deletion_requested',
        ip_address: '0.0.0.0',
        additional_details: { timestamp: new Date().toISOString() }
      });

      toast.success('Account deletion request submitted. You will be contacted within 24 hours.');
    } catch (error: any) {
      console.error('Error requesting account deletion:', error);
      toast.error('Failed to submit deletion request');
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">Loading settings...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences</p>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your orders and account
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings?.email_notifications || false}
                    onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser notifications for important updates
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={settings?.push_notifications || false}
                    onCheckedChange={(checked) => updateSetting('push_notifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="order-updates">Order Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about order status changes
                    </p>
                  </div>
                  <Switch
                    id="order-updates"
                    checked={settings?.order_updates || false}
                    onCheckedChange={(checked) => updateSetting('order_updates', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive promotional emails and special offers
                    </p>
                  </div>
                  <Switch
                    id="marketing-emails"
                    checked={settings?.marketing_emails || false}
                    onCheckedChange={(checked) => updateSetting('marketing_emails', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    value={settings?.theme || 'system'}
                    onChange={(e) => updateSetting('theme', e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    value={settings?.language || 'en'}
                    onChange={(e) => updateSetting('language', e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="en">English</option>
                    <option value="ny">Chichewa</option>
                    <option value="bem">Bemba</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={settings?.currency || 'USD'}
                    onChange={(e) => updateSetting('currency', e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="ZMW">ZMW (K)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Data Privacy</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Control how your data is used and shared
                  </p>
                  <Button variant="outline">
                    Download My Data
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Account Security</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your account security settings
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline">
                      Change Password
                    </Button>
                    <Button variant="outline">
                      Two-Factor Authentication
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Account Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Role</p>
                      <p className="font-medium capitalize">{userRole?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Member Since</p>
                      <p className="font-medium">
                        {new Date(profile?.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="font-medium">
                        {new Date(profile?.updated_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2 text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These actions cannot be undone. Please be careful.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;