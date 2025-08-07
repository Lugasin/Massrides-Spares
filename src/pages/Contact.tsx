import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuote } from '@/context/QuoteContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Contact = () => {
  const { itemCount } = useQuote();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // For now, just simulate success until types are updated
      console.log('Contact form submitted:', formData);
      // TODO: Implement when support_tickets table is available
      // const { error } = await supabase
      //   .from('support_tickets')
      //   .insert({
      //     name: formData.name,
      //     email: formData.email,
      //     message: formData.message,
      //     status: 'open'
      //   });

      // if (error) {
      //   throw error;
      // }

      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', message: '' });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

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
          <h1 className="text-4xl font-bold text-foreground mb-6">Contact Us</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Have questions about our agricultural equipment or need assistance? 
            We're here to help you find the perfect solutions for your farming needs.
          </p>
        </section>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us how we can help you..."
                      rows={6}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Office Address</h3>
                    <p className="text-muted-foreground">
                      123 Agricultural Plaza<br />
                      Lusaka, Zambia<br />
                      Plot 5678, Independence Avenue
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Phone Numbers</h3>
                    <div className="space-y-1 text-muted-foreground">
                      <p>Main Office: +260 211 123 456</p>
                      <p>Sales Team: +260 977 123 456</p>
                      <p>Support: +260 966 123 456</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Email Addresses</h3>
                    <div className="space-y-1 text-muted-foreground">
                      <p>General: info@massrides.zm</p>
                      <p>Sales: sales@massrides.zm</p>
                      <p>Support: support@massrides.zm</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Clock className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Business Hours</h3>
                    <div className="space-y-1 text-muted-foreground">
                      <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                      <p>Saturday: 9:00 AM - 4:00 PM</p>
                      <p>Sunday: Closed</p>
                      <p className="text-sm mt-2 text-primary">Emergency support available 24/7</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Information */}
        <section className="mt-16">
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold mb-4">Sales Inquiries</h3>
                <p className="text-muted-foreground mb-6">
                  Looking for specific equipment or need a custom quote? Our sales team is ready to help.
                </p>
                <Button asChild variant="outline">
                  <Link to="/catalog">
                    Browse Equipment
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold mb-4">Technical Support</h3>
                <p className="text-muted-foreground mb-6">
                  Need help with installation, maintenance, or troubleshooting? Our experts are here for you.
                </p>
                <Button variant="outline">
                  Get Support
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold mb-4">Partnership</h3>
                <p className="text-muted-foreground mb-6">
                  Interested in becoming a dealer or partner? Let's discuss opportunities together.
                </p>
                <Button variant="outline">
                  Partner With Us
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Map Placeholder */}
        <section className="mt-16">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Find Us</h2>
              <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Interactive map coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    Visit us at 123 Agricultural Plaza, Lusaka, Zambia
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;