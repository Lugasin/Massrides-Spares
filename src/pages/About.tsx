import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Target, Award, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuote } from '@/context/QuoteContext';

const About = () => {
  const { itemCount } = useQuote();

  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />
      <Header 
        cartItemsCount={itemCount}
        onAuthClick={() => {}}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back to Home */}
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link to="/">
              ← Back to Home
            </Link>
          </Button>
        </div>

        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-6">About MassRides</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering African agriculture through innovative technology and sustainable farming solutions. 
            We're bridging the gap between modern agricultural equipment and local farming communities.
          </p>
        </section>

        {/* Mission & Vision */}
        <section className="grid md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Target className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-2xl font-bold">Our Mission</h2>
              </div>
              <p className="text-muted-foreground">
                To democratize access to high-quality agricultural equipment across Africa, 
                enabling farmers to increase productivity, improve crop yields, and build 
                sustainable livelihoods through technology-driven farming solutions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Award className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-2xl font-bold">Our Vision</h2>
              </div>
              <p className="text-muted-foreground">
                A future where every farmer in Africa has access to the tools and technology 
                they need to thrive, creating food security and economic prosperity across 
                the continent while preserving our environment for future generations.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Our Story Timeline */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Story</h2>
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <Calendar className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">2020 - The Beginning</h3>
                <p className="text-muted-foreground">
                  Founded with a vision to revolutionize agricultural equipment access in Zambia. 
                  Started with a small team of agricultural engineers and technology enthusiasts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <Calendar className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">2021 - First Partnerships</h3>
                <p className="text-muted-foreground">
                  Established partnerships with leading agricultural equipment manufacturers. 
                  Launched our first digital platform connecting farmers with quality equipment.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <Calendar className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">2023 - Regional Expansion</h3>
                <p className="text-muted-foreground">
                  Expanded operations across Southern Africa, serving over 10,000 farmers 
                  and providing access to modern farming equipment and irrigation systems.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <Calendar className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">2024 - Digital Innovation</h3>
                <p className="text-muted-foreground">
                  Launched our comprehensive e-commerce platform with advanced features 
                  including equipment financing, maintenance support, and farmer training programs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Agricultural Engineers</h3>
                <p className="text-muted-foreground">
                  Expert team with decades of experience in agricultural machinery 
                  and sustainable farming practices.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Technology Specialists</h3>
                <p className="text-muted-foreground">
                  Innovative developers and designers creating user-friendly platforms 
                  that make agricultural technology accessible to all.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Local Partners</h3>
                <p className="text-muted-foreground">
                  Network of local distributors and service providers ensuring 
                  farmers get the support they need, when they need it.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Innovation</h3>
                <p className="text-sm text-muted-foreground">
                  Embracing cutting-edge technology to solve agricultural challenges.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Sustainability</h3>
                <p className="text-sm text-muted-foreground">
                  Promoting eco-friendly farming practices for future generations.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Community</h3>
                <p className="text-sm text-muted-foreground">
                  Building strong relationships with farming communities across Africa.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Excellence</h3>
                <p className="text-sm text-muted-foreground">
                  Delivering the highest quality equipment and services.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <Card>
            <CardContent className="p-12">
              <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Farm?</h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of farmers who have already modernized their operations with MassRides.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link to="/catalog">
                    Browse Equipment
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/contact">
                    Contact Us
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;