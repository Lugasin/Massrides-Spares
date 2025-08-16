import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Shield, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PaymentMethod {
  id: string;
  payment_method_token: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

const PaymentMethods: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      fetchPaymentMethods();
    }
  }, [user, profile]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('tj_payment_methods')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      setProcessingAction('add');
      
      const { data, error } = await supabase.functions.invoke('create-payment-session', {
        body: {
          purpose: 'tokenize',
          currency: 'USD',
          return_url: `${window.location.origin}/profile/payment-methods?status=success`,
          cancel_url: `${window.location.origin}/profile/payment-methods?status=cancelled`
        }
      });

      if (error) throw error;

      if (data?.payment_url) {
        // Open TJ HPP in new window
        const popup = window.open(
          data.payment_url,
          'tj-payment',
          'width=600,height=800,scrollbars=yes,resizable=yes'
        );

        // Listen for popup close or success
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            fetchPaymentMethods(); // Refresh payment methods
            setProcessingAction(null);
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
      setProcessingAction(null);
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      setProcessingAction(methodId);
      
      const { error } = await supabase
        .from('tj_payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;

      toast.success('Payment method deleted successfully');
      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setProcessingAction(methodId);

      // First, unset all other defaults
      await supabase
        .from('tj_payment_methods')
        .update({ is_default: false })
        .eq('user_id', profile?.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('tj_payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) throw error;

      toast.success('Default payment method updated');
      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      toast.error('Failed to update default payment method');
    } finally {
      setProcessingAction(null);
    }
  };

  if (!user) {
    return (
      <DashboardLayout userRole="guest" userName="Guest">
        <div className="p-6 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground">Please sign in to manage your payment methods.</p>
        </div>
      </DashboardLayout>
    );
  }

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
          <Button 
            onClick={handleAddPaymentMethod}
            disabled={processingAction === 'add'}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {processingAction === 'add' ? 'Processing...' : 'Add Payment Method'}
          </Button>
        </div>

        {/* Security Notice */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Secure Payment Processing</p>
                <p className="text-sm text-green-700">
                  Your payment information is securely processed and tokenized. We never store your full card details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods List */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Payment Methods ({paymentMethods.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading payment methods...</p>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No payment methods added</h3>
                <p className="text-muted-foreground mb-6">
                  Add a payment method to make checkout faster and easier.
                </p>
                <Button 
                  onClick={handleAddPaymentMethod}
                  disabled={processingAction === 'add'}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Payment Method
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      method.is_default 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-7 bg-muted rounded flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {method.brand} •••• {method.last4}
                            </span>
                            {method.is_default && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Expires {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                            <span className="ml-2">•</span>
                            <span className="ml-2">
                              Added {formatDistanceToNow(new Date(method.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!method.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                            disabled={processingAction === method.id}
                          >
                            {processingAction === method.id ? 'Setting...' : 'Set as Default'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          disabled={processingAction === method.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-1">Payment Security & Compliance</p>
                <ul className="text-blue-700 space-y-1">
                  <li>• All transactions are processed securely through our certified payment partner</li>
                  <li>• 3D Secure authentication is enforced for enhanced security</li>
                  <li>• We are PCI DSS compliant and never store your full card details</li>
                  <li>• All payments are processed in USD currency</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentMethods;