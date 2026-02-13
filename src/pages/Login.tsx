import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, ArrowRight, CheckCircle2, Phone, Smartphone } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import irrigationAerial from "@/assets/irrigation-aerial.jpg";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuthEvent } from '@/lib/activityLogger';

const backgroundImage = irrigationAerial;

export default function Login() {
  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Common state
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setAuthMethod('email');
    }
  }, [location.search]);

  useEffect(() => {
    if (user) {
      const searchParams = new URLSearchParams(location.search);
      const returnUrl = searchParams.get('returnUrl');
      navigate(returnUrl || '/dashboard');
    }
  }, [user, navigate, location.search]);

  // Format phone for Zambia
  const formatPhone = (input: string): string => {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.startsWith('260')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+260${cleaned.slice(1)}`;
    return `+260${cleaned}`;
  };

  // Send Phone OTP
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 9) {
      setErrorMessage('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formattedPhone = formatPhone(phone);
      console.log('Sending OTP to:', formattedPhone);

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone
      });

      if (error) {
        console.error('Phone OTP error:', error);
        // Fallback: suggest email if phone fails
        if (error.message.includes('not enabled') || error.message.includes('provider')) {
          setErrorMessage('SMS not available. Please use email login.');
          setAuthMethod('email');
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      setOtpSent(true);
      toast.success('Verification code sent to your phone!');
    } catch (error: any) {
      console.error('OTP error:', error);
      setErrorMessage('Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyPhoneOtp = async () => {
    if (!otp || otp.length < 6) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formattedPhone = formatPhone(phone);

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms'
      });

      if (error) {
        console.error('Verify OTP error:', error);
        setErrorMessage(error.message || 'Invalid verification code');
        return;
      }

      toast.success('Login successful!');
      // AuthContext will handle redirect
    } catch (error: any) {
      console.error('Verification error:', error);
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login Error:", error);
        setErrorMessage("Invalid email or password. Please try again.");
        return;
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Social login
  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/welcome` }
      });
      if (error) {
        toast.error(`${provider} sign in failed: ${error.message}`);
      }
    } catch (error: any) {
      toast.error(`Failed to sign in with ${provider}`);
    }
    setIsLoading(false);
  };

  // Guest login
  const handleGuestLogin = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'guest-' + Date.now() + '-' + Math.random().toString(36).substring(2);

      localStorage.setItem('guest_session_id', sessionId);
      localStorage.setItem('user_role', 'guest');

      try {
        logAuthEvent('guest_login', undefined, { session_id: sessionId });
      } catch (err) { }

      toast.success('Logged in as Guest');
      navigate('/guest-shopping');
    } catch (error) {
      navigate('/guest-shopping');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${backgroundImage})`,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center text-white mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="text-lg opacity-90">Access your Massrides Spares portal</p>
        </div>

        <Card className="w-full bg-white/95 backdrop-blur-sm border-primary/20 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl lg:text-2xl font-bold text-primary">Sign In</CardTitle>
            <CardDescription>
              Choose your preferred login method
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Success messages */}
            {location.search.includes('registration=success') && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5" /> Registration successful!
              </div>
            )}
            {location.search.includes('verified=true') && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5" /> Email verified! You can now sign in.
              </div>
            )}

            {/* Auth Method Tabs */}
            <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'phone' | 'email')} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Phone
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
              </TabsList>

              {/* Phone OTP Tab */}
              <TabsContent value="phone" className="space-y-4 mt-4">
                {!otpSent ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-primary" />
                        Phone Number
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                          +260
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                          placeholder="97 1234567"
                          className="rounded-l-none h-11"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        We'll send you a verification code via SMS
                      </p>
                    </div>

                    <Button
                      onClick={handleSendPhoneOtp}
                      disabled={isLoading || phone.length < 9}
                      className="w-full h-11 bg-primary hover:bg-primary-hover"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </div>
                      ) : (
                        <>
                          Send Verification Code
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-sm text-muted-foreground">
                        Enter the code sent to <strong>+260{phone}</strong>
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        className="text-center text-2xl tracking-widest h-14"
                        maxLength={6}
                      />

                      <Button
                        onClick={handleVerifyPhoneOtp}
                        disabled={isLoading || otp.length < 6}
                        className="w-full h-11 bg-primary hover:bg-primary-hover"
                      >
                        {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => { setOtpSent(false); setOtp(''); }}
                        className="w-full text-sm"
                      >
                        Use different number
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Email/Password Tab */}
              <TabsContent value="email" className="mt-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2 text-sm">
                      <Lock className="h-4 w-4 text-primary" />
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-primary hover:bg-primary-hover"
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {errorMessage}
              </div>
            )}

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignIn('google')}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleGuestLogin}
                disabled={isLoading}
              >
                Continue as Guest
              </Button>
            </div>

            {/* Register Link */}
            <div className="text-center mt-4">
              <Link to="/register" className="text-sm text-primary hover:underline">
                Don't have an account? Register
              </Link>
            </div>

            {/* Back to Home */}
            <div className="text-center mt-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/">← Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}