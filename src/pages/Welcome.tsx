import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Tractor, ArrowRight, Sparkles, Users, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_id: string;
  created_at: string;
  email: string;
  role: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest' | null;
  is_verified: boolean;
}

const Welcome: React.FC = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleWelcomeFlow = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile, error } = await (supabase as any)
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (error) {
            throw error;
          }

          if (profile) {
            setUserProfile(profile);
            const createdAt = new Date(profile.created_at);
            const now = new Date();
            const timeDiff = now.getTime() - createdAt.getTime();
            const isRecent = timeDiff < (24 * 60 * 60 * 1000); // Less than 24 hours
            
            setIsNewUser(isRecent);
            
            if (isRecent && profile.is_verified) {
              await (supabase as any).from('notifications').insert({
                user_id: profile.id,
                title: '🎉 Welcome to Massrides!',
                message: 'Your account is verified and ready. Explore our comprehensive spare parts catalog and start building your equipment inventory.',
                type: 'welcome'
              });
            }
          }
        }
      } catch (error: any) {
        console.error('Welcome flow error:', error);
        toast.error('Could not load your welcome information.');
      } finally {
        setLoading(false);
      }
    };

    handleWelcomeFlow();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <CardTitle className="text-3xl font-bold mb-2">
              Loading Your Welcome Page...
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Please wait a moment.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold mb-2">
            {isNewUser ? '🎉 Welcome to Massrides!' : '👋 Welcome Back!'}
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            {isNewUser 
              ? 'Your account is verified and ready to use'
              : 'Good to see you again'
            }
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isNewUser && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Get Started with Massrides
              </h3>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-background rounded-lg border">
                  <Tractor className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-2">Browse Parts</h4>
                  <p className="text-sm text-muted-foreground">
                    Explore our extensive catalog of agricultural spare parts
                  </p>
                </div>
                
                <div className="text-center p-4 bg-background rounded-lg border">
                  <ShoppingCart className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-2">Start Shopping</h4>
                  <p className="text-sm text-muted-foreground">
                    Add parts to your cart and place orders easily
                  </p>
                </div>
                
                <div className="text-center p-4 bg-background rounded-lg border">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-2">Connect</h4>
                  <p className="text-sm text-muted-foreground">
                    Message vendors and get expert support
                  </p>
                </div>
              </div>
            </div>
          )}

          {userProfile && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Account Details</h4>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span> {userProfile.email}
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span> 
                  <span className="ml-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                    {userProfile.role?.replace('_', ' ').toUpperCase() || 'CUSTOMER'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                    userProfile.is_verified 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {userProfile.is_verified ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              asChild 
              size="lg" 
              className="w-full"
            >
              <Link to="/catalog">
                <Tractor className="mr-2 h-5 w-5" />
                Browse Spare Parts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <div className="grid gap-3 md:grid-cols-2">
              <Button 
                asChild 
                variant="outline" 
                size="lg"
                className="w-full"
              >
                <Link to="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                size="lg"
                className="w-full"
              >
                <Link to="/profile">
                  Complete Profile
                </Link>
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Need help? Visit our{' '}
              <Link to="/contact" className="text-primary hover:underline">
                support center
              </Link>{' '}
              or check out the{' '}
              <Link to="/about" className="text-primary hover:underline">
                about page
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Welcome;