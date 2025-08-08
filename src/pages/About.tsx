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
            Empowering African agriculture through reliable spare parts and technical expertise. 
            We're bridging the gap between equipment maintenance needs and quality spare parts availability.
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
                To democratize access to high-quality agricultural spare parts across Africa, 
                enabling farmers to maintain their equipment efficiently, reduce downtime, and build 
                sustainable operations through reliable parts supply and technical support.
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
                A future where every farmer in Africa has access to the spare parts and technical support 
                they need to keep their equipment running, creating food security and economic prosperity 
                across the continent while minimizing equipment downtime.
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
                  Founded with a vision to revolutionize agricultural spare parts access in Zambia. 
                  Started with a small team of parts specialists and agricultural technicians.
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
                  Established partnerships with leading spare parts suppliers and OEM manufacturers. 
                  Launched our first digital platform connecting farmers with quality spare parts.
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
                  Expanded operations across Southern Africa, serving over 10,000 farmers and mechanics
                  with access to genuine and aftermarket agricultural spare parts.
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
                  including parts compatibility checking, technical support, and mechanic training programs.
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
                  Expert team with decades of experience in agricultural equipment 
                  and spare parts compatibility across all major brands.
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
                  that make spare parts identification and ordering accessible to all.
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
                  Network of local parts dealers and mechanics ensuring 
                  farmers get the spare parts and technical support they need, when they need it.
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
                  Embracing cutting-edge technology to solve spare parts supply challenges.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Sustainability</h3>
                <p className="text-sm text-muted-foreground">
                  Promoting equipment longevity and reducing waste through quality spare parts.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Community</h3>
                <p className="text-sm text-muted-foreground">
                  Building strong relationships with farming and mechanic communities across Africa.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Excellence</h3>
                <p className="text-sm text-muted-foreground">
                  Delivering the highest quality spare parts and technical services.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <Card>
            <CardContent className="p-12">
              <h2 className="text-2xl font-bold mb-4">Need Spare Parts for Your Equipment?</h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of farmers and mechanics who trust MassRides for their spare parts needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link to="/catalog">
                    Browse Parts
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/contact">
                    Get Technical Help
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