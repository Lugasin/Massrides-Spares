import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout'; // Assuming a basic layout component exists

const GuestProfile: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout> {/* Use your main layout component */}
      <div className="container mx-auto py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Welcome, Guest!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              You are currently viewing the site as a guest. Please log in or sign up to access personalized features.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={() => navigate('/login')}>Login</Button>
              <Button variant="outline" onClick={() => navigate('/register')}>Sign Up</Button>
              <Button variant="secondary" className="sm:col-span-2" onClick={() => navigate('/catalog')}>Shop Now</Button>
            </div>
            <Button variant="link" onClick={() => navigate('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default GuestProfile;