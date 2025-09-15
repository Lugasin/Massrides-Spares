import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Chrome, Facebook, Github } from 'lucide-react';

const SocialLogin: React.FC = () => {
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error('Social login error:', error);
        toast.error(`Failed to sign in with ${provider}: ${error.message}`);
      }
    } catch (error) {
      console.error('Social login error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Continue with Social Login</CardTitle>
          <p className="text-muted-foreground">Choose your preferred sign-in method</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleSocialLogin('google')}
          >
            <Chrome className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleSocialLogin('facebook')}
          >
            <Facebook className="w-5 h-5 mr-2" />
            Continue with Facebook
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleSocialLogin('github')}
          >
            <Github className="w-5 h-5 mr-2" />
            Continue with GitHub
          </Button>

          <div className="text-center pt-4">
            <a 
              href="/login" 
              className="text-sm text-muted-foreground hover:text-primary underline"
            >
              Back to email login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialLogin;