import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const VendorSettingsPanel = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [payoutMethod, setPayoutMethod] = useState('mobile_money');
  const [mobilePhone, setMobilePhone] = useState('');
  const [bankId, setBankId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    async function loadMetadata() {
      if (!session?.user?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('metadata')
          .eq('id', session.user.id)
          .single();
          
        if (error) throw error;
        
        const metadata = data?.metadata as any || {};
        if (metadata.payout_method) setPayoutMethod(metadata.payout_method);
        if (metadata.mobile_money_phone) setMobilePhone(metadata.mobile_money_phone);
        if (metadata.bank_account) {
          setBankId(metadata.bank_account.bank_id || '');
          setAccountNumber(metadata.bank_account.account_number || '');
        }
      } catch (err: any) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    
    void loadMetadata();
  }, [session]);

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    
    try {
      // Construct metadata JSON
      const metadataUpdate = {
        payout_method: payoutMethod,
        mobile_money_phone: payoutMethod === 'mobile_money' ? mobilePhone : null,
        bank_account: payoutMethod === 'bank' ? {
          bank_id: bankId,
          account_number: accountNumber
        } : null
      };

      // Since metadata is jsonb, we standard update
      // It's safer to fetch existing metadata and merge to avoid overwriting other keys
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('metadata')
        .eq('id', session.user.id)
        .single();
      
      const updatedMetadata = {
        ...(userProfile?.metadata as any || {}),
        ...metadataUpdate
      };

      const { error } = await supabase
        .from('user_profiles')
        .update({ metadata: updatedMetadata })
        .eq('id', session.user.id);
        
      if (error) throw error;
      
      toast.success("Payout settings saved securely.");
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-muted-foreground text-sm">Loading settings...</div>;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Payout Settings</CardTitle>
        <CardDescription>
          Configure how you receive your earnings. These details are securely required by Vesicash before any withdrawal can be processed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Preferred Withdrawal Method</Label>
          <Select value={payoutMethod} onValueChange={setPayoutMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select payout method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {payoutMethod === 'mobile_money' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <Label>Mobile Money Number</Label>
            <Input 
              placeholder="e.g. 0971234567" 
              value={mobilePhone}
              onChange={(e) => setMobilePhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Supported: MTN, Airtel, Zamtel.</p>
          </div>
        )}

        {payoutMethod === 'bank' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label>Bank Routing ID / Code</Label>
              <Input 
                placeholder="e.g. ZANACO" 
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input 
                type="text"
                placeholder="Account No." 
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Saving...' : 'Save Payout Details'}
        </Button>
      </CardFooter>
    </Card>
  );
};
