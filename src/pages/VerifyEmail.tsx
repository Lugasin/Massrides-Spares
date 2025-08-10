import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const email = searchParams.get('email');

  useEffect(() => {
    if (type === 'email_confirmation' || type === 'signup') {
      handleEmailVerification();
    } else if (type === 'recovery') {
      // Handle password recovery
      navigate('/reset-password');
    }
  }, [token, type]);

  const handleEmailVerification = async () => {
    if (!token) {
      setVerificationStatus('error');
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        console.error('Email verification error:', error);
        if (error.message.includes('expired')) {
          setVerificationStatus('expired');
        } else {
          setVerificationStatus('error');
        }
        toast.error(`Verification failed: ${error.message}`);
      } else if (data.user) {
        setVerificationStatus('success');
        toast.success('Email verified successfully!');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      toast.error('An unexpected error occurred during verification');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address not found. Please try signing up again.');
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });

      if (error) {
        toast.error(`Failed to resend verification: ${error.message}`);
      } else {
        toast.success('Verification email sent! Check your inbox.');
      }
    } catch (error: any) {
      toast.error('Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your email address.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-success mb-4">Email Verified Successfully!</h2>
            <p className="text-muted-foreground mb-6">
              Your email has been verified. You now have full access to all Massrides features.
            </p>
            <div className="space-y-3">
              <Button asChild size="lg" className="w-full">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/catalog">
                  Browse Spare Parts
                </Link>
              </Button>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center py-8">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-destructive mb-4">Verification Link Expired</h2>
            <p className="text-muted-foreground mb-6">
              The verification link has expired. Please request a new verification email.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleResendVerification}
                disabled={isResending}
                size="lg" 
                className="w-full"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/register">
                  Create New Account
                </Link>
              </Button>
            </div>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center py-8">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-destructive mb-4">Verification Failed</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't verify your email address. The link may be invalid or expired.
            </p>
            <div className="space-y-3">
              {email && (
                <Button 
                  onClick={handleResendVerification}
                  disabled={isResending}
                  size="lg" 
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              )}
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/login">
                  Back to Login
                </Link>
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;