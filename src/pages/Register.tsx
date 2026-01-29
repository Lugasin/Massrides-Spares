import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Mail, Phone, User, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import tractorPlowing from "@/assets/tractor-plowing.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const backgroundImage = tractorPlowing;

export default function Register() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const [formData, setFormData] = useState({
    fullName: "",
    email: searchParams.get('email') || "",
    phone: searchParams.get('phone') || "",
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Info, 2: OTP
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use Phone OTP if phone is provided, else Email OTP
      const { error } = formData.phone
        ? await supabase.auth.signInWithOtp({
            phone: formData.phone,
            options: { data: { full_name: formData.fullName } }
          })
        : await supabase.auth.signInWithOtp({
            email: formData.email,
            options: { data: { full_name: formData.fullName } }
          });

      if (error) throw error;

      toast.success("Verification code sent!");
      setStep(2);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = formData.phone
        ? await supabase.auth.verifyOtp({ phone: formData.phone, token: otp, type: 'sms' })
        : await supabase.auth.verifyOtp({ email: formData.email, token: otp, type: 'email' });

      if (error) throw error;

      toast.success("Account created and verified!");
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${backgroundImage})` }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Join Massrides</h1>
          <p className="text-lg opacity-90">Start your spares journey</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Create Account</CardTitle>
            <CardDescription className="text-center">
              {searchParams.get('email') ? "Complete your registration to track your order" : "Join our agricultural spares platform"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Preferred)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+260..."
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">We'll use this for SMS verification</p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Register & Send OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="text-center space-y-2">
                  <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Enter the code sent to {formData.phone || formData.email}
                  </p>
                </div>
                <Input
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify & Complete"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
                  Go Back
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in instead
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}