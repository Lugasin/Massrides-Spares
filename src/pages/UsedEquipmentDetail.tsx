import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Assuming you have Card components
import { UsedEquipment } from '../data/products'; // Import UsedEquipment type
import { Badge } from '@/components/ui/badge'; // Assuming you have Badge component
import { Button } from '@/components/ui/button'; // Assuming you have Button component
import { ShoppingCart } from 'lucide-react'; // Assuming you have lucide-react icons
import { Input } from '@/components/ui/input'; // Assuming you have Input component
import { Label } from '@/components/ui/label'; // Assuming you have Label component
import { Textarea } from '@/components/ui/textarea'; // Assuming you have Textarea component

import { supabase } from '../lib/supabaseClient'; // Import Supabase client
import { LoadingSpinner } from '@/components/LoadingSpinner'; // Assuming you have a LoadingSpinner component


const UsedEquipmentDetail: React.FC = () => {
  const [yourName, setYourName] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [yourMessage, setYourMessage] = useState('');
  const [equipment, setEquipment] = useState<UsedEquipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainImage, setMainImage] = useState<string>('');

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEquipment = async () => {
      const { data, error } = await supabase.from('used_equipment').select('*').eq('id', id).single();

      if (error) {
        setError(error.message);
      } else {
        setEquipment(data);
        // Set the first image as the main image
        if (data && data.image_urls && data.image_urls.length > 0) {
          setMainImage(data.image_urls[0]);
        }
      }
      setLoading(false);
    };
    fetchEquipment();
  }, [id]);

  if (loading) {
    return <LoadingSpinner />; // Display loading spinner while fetching
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-destructive">
        <p>Error loading equipment details: {error}</p>
      </div>
    );
  }
  if (!equipment) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Used Equipment Not Found</h1>
        <p className="text-muted-foreground">The requested used equipment item could not be found.</p>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      console.log('Inquiry Details:', {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        yourName,
        yourEmail,
        yourMessage,
      });
      alert('Your inquiry has been sent!'); // Simple confirmation
    }}>
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{equipment.name}</CardTitle>
 {equipment.is_sold && (
            <Badge variant="destructive" className="ml-auto text-lg">
 Sold
 </Badge>
 )}
        </CardHeader>
        <CardContent>
          {/* Main Image */}
          {mainImage && (
            <img src={mainImage} alt={equipment.name} className="w-full h-64 object-cover rounded-md mb-4" />
          )}

          {/* Thumbnail Gallery */}
          {equipment.image_urls && equipment.image_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto mb-4">
              {equipment.image_urls.map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`${equipment.name} - Image ${index + 1}`}
                  className={`w-20 h-20 object-cover rounded-md cursor-pointer ${mainImage === imageUrl ? 'border-2 border-primary' : ''}`}
                  onClick={() => setMainImage(imageUrl)}
                />
              ))}
            </div>
          )}
          <p className="text-muted-foreground mb-4">{equipment.description}</p>
          <p className="text-lg font-bold mb-2">${equipment.price.toLocaleString()}</p>
          <Badge variant="secondary" className="mr-2">Condition: {equipment.condition}</Badge>
          <Badge variant="secondary" className="mr-2">Year: {equipment.year}</Badge>
          <Badge variant="secondary">Hours of Use: {equipment.hours_of_use}</Badge>

          {/* Add more details here as needed */}

          {/* Seller Information Section - Placeholder */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-xl font-semibold mb-3">Seller Information</h3>
            <p className="text-muted-foreground">Name: [Seller Name]</p>
            <p className="text-muted-foreground">Email: [Seller Email]</p>
            <p className="text-muted-foreground">Phone: [Seller Phone]</p>
            {/* Add more seller details here */}
          </div>

          {/* Contact Form Section */}
          <div className={`mt-6 pt-6 border-t border-border ${equipment.is_sold ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-xl font-semibold mb-3">Contact Seller</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                <Label htmlFor="your-name">Your Name</Label>
                <Input id="your-name" placeholder="Enter your name" value={yourName} onChange={(e) => setYourName(e.target.value)} required />
 </div>
              <div>
                <Label htmlFor="your-email">Your Email</Label>
                <Input id="your-email" type="email" placeholder="Enter your email" value={yourEmail} onChange={(e) => setYourEmail(e.target.value)} required />
 </div>
              </div>
              <div>
                <Label htmlFor="your-message">Your Message</Label>
                <Textarea id="your-message" placeholder="Enter your message" value={yourMessage} onChange={(e) => setYourMessage(e.target.value)} required />
              <div className="flex justify-end">
                <Button type="submit" disabled={equipment.is_sold}>Send Inquiry</Button>
              </div>
            </div>
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
    </form>
  );
};

export default UsedEquipmentDetail;
