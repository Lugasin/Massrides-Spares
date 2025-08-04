import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import irrigationAerial from "@/assets/irrigation-aerial.jpg"; // Example background image
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

// Define a customizable background image URL - You can add more images to assets and change this
const backgroundImage = irrigationAerial; 

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignIn();
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (!error) {
      navigate('/dashboard');
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
            <h1 className="text-2xl lg:text-4xl font-bold mb-2 lg:mb-4">Welcome Back</h1>
            <p className="text-sm lg:text-xl opacity-90">
              Access your agriculture equipment portal
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-4 lg:p-8 bg-gradient-farm">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-primary/20 shadow-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-xl lg:text-2xl font-bold text-primary">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {location.search.includes('registration=success') && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5" /> Registration successful! Please check your email for confirmation.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="focus:ring-primary focus:border-primary h-11"
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
                  className="focus:ring-primary focus:border-primary h-11"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                <Link to="/register" className="text-primary hover:underline">
                  Don't have an account?
                </Link>
                <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">
                  Forgot password?
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
                    Signing In...
                  </div>
                ) : (
                  <>
                    Sign In
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