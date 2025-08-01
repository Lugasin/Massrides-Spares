import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import irrigationAerial from "@/assets/irrigation-aerial.jpg"; // Example background image

// Define a customizable background image URL - You can add more images to assets and change this
const backgroundImage = irrigationAerial; 


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log("Login attempt:", { email, password });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Background Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(46, 125, 50, 0.6), rgba(46, 125, 50, 0.4)), url(${backgroundImage})`,
          }}
        />
        <div className="relative z-10 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome Back</h1>
            <p className="text-xl opacity-90">
              Access your agriculture equipment portal
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-farm">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-primary/20 shadow-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
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
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
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
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-hover hover-glow group"
              >
                Sign In
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>

              {/* Social Login Placeholders */}
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background/90 backdrop-blur-sm px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                {/* Google Login Button */}
                <Button variant="outline" size="icon" className="rounded-full">
                   {/* Replace with Google logo SVG or img */}
                   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.0003 4.75C14.0003 4.75 15.6333 5.45 16.9003 6.61667L19.5003 4.01667C17.767 2.35 15.2003 1.25 12.0003 1.25C7.73366 1.25 4.00033 3.25833 1.83366 6.33333L6.25033 9.15833C7.29199 6.21667 9.417 4.75 12.0003 4.75Z" fill="#EA4335"/><path d="M23.5837 12.2167C23.5837 11.4167 23.5087 10.75 23.3587 10.0833H12.0003V14.5167H18.4337C18.167 15.9167 17.317 17.1833 16.0003 18.0667C16.0003 18.1417 16.0003 18.1417 16.0003 18.1417L20.467 21.4167C23.017 19.05 24.5837 15.6833 24.5837 12.2167H23.5837Z" fill="#4285F4"/><path d="M6.25037 14.525C5.7337 13.1333 5.7337 11.6333 6.25037 10.2417L1.8337 7.41667C0.0670396 11.1 0.0670396 15.6 1.8337 19.2833L6.25037 16.4583C6.00037 15.7667 6.00037 15.1417 6.25037 14.525Z" fill="#FBBC05"/><path d="M16.0004 18.0667C14.767 18.9667 13.2004 19.5834 11.417 19.5834C8.84199 19.5834 6.717 18.1084 5.67533 15.1667L1.25866 18.0417C3.14199 21.2417 7.15033 23.7501 11.417 23.7501C15.1837 23.7501 18.3504 22.3417 20.467 19.0501L16.0004 18.0667Z" fill="#34A853"/></svg>
                </Button>
                {/* Facebook Login Button */}
                 <Button variant="outline" size="icon" className="rounded-full">
                   {/* Replace with Facebook logo SVG or img */}
                   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.03992C6.5 2.03992 2 6.52992 2 12.0099C2 17.0599 5.54 21.2399 10.5 22.0099V14.2499H7.5V10.8099H10.5V8.23992C10.5 5.27992 12.32 3.64992 15.03 3.64992C16.33 3.64992 17.68 3.87992 17.68 3.87992V6.90992H16.14C14.68 6.90992 14.42 7.80992 14.42 8.73992V10.8099H17.5L17 14.2499H14.42V22.0099C19.36 21.2399 23 17.0599 23 12.0099C23 6.52992 18.5 2.03992 12 2.03992Z" fill="#1877F2"/></svg>
                </Button>
                 {/* Add other social login buttons here (e.g., Twitter, LinkedIn) */}
              </div>


            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}