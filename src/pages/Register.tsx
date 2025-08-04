import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import tractorPlowing from "@/assets/tractor-plowing.jpg"; // Example background image
import { Mail, Lock, User, Phone, ArrowRight, Building } from "lucide-react";

// Define a customizable background image URL - You can add more images to assets and change this
const backgroundImage = tractorPlowing; 

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(formData.email, formData.password, {
      full_name: formData.fullName,
      phone: formData.phone,
      company_name: formData.companyName,
      email: formData.email
    });
    
    if (error) {
      console.error("Registration error:", error);
    } else {
      navigate('/login?registration=success');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Background Image */}
      <div className="h-32 lg:h-auto lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(46, 125, 50, 0.6), rgba(46, 125, 50, 0.4)), url(${backgroundImage})`,
          }}
        />
        <div className="relative z-10 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <h1 className="text-2xl lg:text-4xl font-bold mb-2 lg:mb-4">Join Massrides</h1>
            <p className="text-sm lg:text-xl opacity-90">
              Start your agriculture equipment journey today
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-4 lg:p-8 bg-gradient-farm">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-primary/20 shadow-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-xl lg:text-2xl font-bold text-primary">Create Account</CardTitle>
            <CardDescription>
              Join our agriculture equipment platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-primary" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="John Doe"
                  required
                  className="border-primary/20 focus:border-primary h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-primary" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="border-primary/20 focus:border-primary h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-primary" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+260 xxx xxx xxx"
                  required
                  className="border-primary/20 focus:border-primary h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-primary" />
                  Company/Farm Name (Optional)
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  placeholder="Your Farm or Company"
                  className="border-primary/20 focus:border-primary h-11"
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
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="border-primary/20 focus:border-primary h-11"
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4 text-primary" />
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  required
                  className="border-primary/20 focus:border-primary h-11"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign In
                </Link>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-11 bg-primary hover:bg-primary-hover hover-glow group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </div>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}