import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import tractorPlowing from "@/assets/tractor-plowing.jpg";
import { Mail, Lock, User, Phone, ArrowRight, Building, Smartphone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const backgroundImage = tractorPlowing;

export default function Register() {
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
    confirmPassword: ""
  });

  // Phone OTP specific state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhone = (input: string): string => {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.startsWith('260')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+260${cleaned.slice(1)}`;
    return `+260${cleaned}`;
  };

  // Handle Phone Registration & Send OTP
  const handlePhoneRegister = async () => {
    if (!formData.phone || formData.phone.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = formatPhone(formData.phone);

      // We sign up with phone
      const { data, error } = await supabase.auth.signUp({
        phone: formattedPhone,
        password: Math.random().toString(36).slice(-10), // Random password for OTP-only flow if needed, or just let Supabase handle it
        options: {
          data: {
            full_name: formData.fullName,
            phone: formattedPhone,
            company_name: formData.companyName,
          }
        }
      });

      if (error) throw error;

      setOtpSent(true);
      toast.success('Verification code sent to your phone!');
    } catch (error: any) {
      console.error('Phone Register Error:', error);
      toast.error(error.message || 'Failed to start registration');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Phone Registration
  const handleVerifyPhone = async () => {
    if (!otp || otp.length < 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = formatPhone(formData.phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms'
      });

      if (error) throw error;

      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Verification Error:', error);
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            company_name: formData.companyName,
          }
        }
      });

      if (!error) {
        navigate('/login?message=check-email');
      }
    } catch (error: any) {
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/welcome` }
      });
      if (error) toast.error(`${provider} sign up failed: ${error.message}`);
    } catch (error: any) {
      toast.error(`Failed to sign up with ${provider}`);
    } finally {
      setIsLoading(false);
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
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Join Massrides</h1>
          <p className="text-lg opacity-90">Start your spares journey today</p>
        </div>

        <Card className="w-full bg-white/95 backdrop-blur-sm border-primary/20 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl lg:text-2xl font-bold text-primary">Create Account</CardTitle>
            <CardDescription>Join our agricultural spares community</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'phone' | 'email')} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Phone
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </TabsTrigger>
              </TabsList>

              {/* Shared Profile Info */}
              <div className="space-y-4 mt-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-primary" /> Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    placeholder="John Doe"
                    required
                    className="h-11 border-primary/20"
                  />
                </div>
              </div>

              {/* Phone Registration Content */}
              <TabsContent value="phone" className="space-y-4">
                {!otpSent ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone" className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-primary" /> Phone Number
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground font-medium">
                          +260
                        </div>
                        <Input
                          id="reg-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, '').slice(0, 9))}
                          placeholder="97 1234567"
                          className="rounded-l-none h-11 border-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-primary" /> Farm/Company (Optional)
                      </Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        placeholder="Your Farm Name"
                        className="h-11 border-primary/20"
                      />
                    </div>

                    <Button
                      onClick={handlePhoneRegister}
                      disabled={isLoading || formData.phone.length < 9 || !formData.fullName}
                      className="w-full h-11 bg-primary hover:bg-primary-hover group"
                    >
                      {isLoading ? 'Sending Code...' : (
                        <>
                          Send Verification Code
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                      <p className="text-sm text-blue-800">
                        Code sent to <strong>+260{formData.phone}</strong>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-center block">Verification Code</Label>
                      <Input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="text-center text-3xl tracking-widest h-14 font-bold border-primary"
                        maxLength={6}
                      />
                    </div>
                    <Button
                      onClick={handleVerifyPhone}
                      disabled={isLoading || otp.length < 6}
                      className="w-full h-11 bg-primary"
                    >
                      {isLoading ? 'Verifying...' : 'Complete Registration'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setOtpSent(false)}
                      className="w-full text-sm"
                    >
                      Use a different number
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Email Registration Content */}
              <TabsContent value="email" className="space-y-4">
                <form onSubmit={handleEmailRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" /> Email Address
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="h-11 border-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2 text-sm">
                      <Lock className="h-4 w-4 text-primary" /> Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-11 border-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-11 border-primary/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !formData.fullName || !formData.email}
                    className="w-full h-11 bg-primary hover:bg-primary-hover"
                  >
                    {isLoading ? 'Creating Account...' : 'Register with Email'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignUp('google')}
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
              <Button asChild variant="ghost">
                <Link to="/login">Sign In Instead</Link>
              </Button>
            </div>

            <div className="text-center mt-6">
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