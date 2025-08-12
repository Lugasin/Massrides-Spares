import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usedSparePartsData, UsedSparePart } from '@/data/products';

const UsedEquipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const item: UsedSparePart | undefined = usedSparePartsData.find((p) => String(p.id) === id);

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Used Equipment Not Found</h1>
        <p className="text-muted-foreground mb-6">The requested used equipment item could not be found.</p>
        <Button asChild>
          <Link to="/used-parts">Back to Used Parts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {item.name}
            <Badge variant="secondary">{item.condition}</Badge>
            {!item.inStock && <Badge variant="destructive">Out of Stock</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <img src={item.image} alt={item.name} className="w-full h-64 object-cover rounded-md mb-4" />

          <p className="text-muted-foreground mb-4">{item.description}</p>
          <div className="flex gap-2 mb-4">
            <Badge variant="outline">Category: {item.category}</Badge>
            {item.partNumber && <Badge variant="outline">Part #: {item.partNumber}</Badge>}
            {item.originalEquipment && <Badge variant="outline">From: {item.originalEquipment}</Badge>}
          </div>

          <h3 className="text-xl font-semibold mb-3">Contact Seller</h3>
          <form className="space-y-4 max-w-lg">
            <div>
              <Label htmlFor="your-name">Your Name</Label>
              <Input id="your-name" placeholder="Enter your name" required />
            </div>
            <div>
              <Label htmlFor="your-email">Your Email</Label>
              <Input id="your-email" type="email" placeholder="Enter your email" required />
            </div>
            <div>
              <Label htmlFor="your-message">Your Message</Label>
              <Textarea id="your-message" placeholder="Enter your message" required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!item.inStock}>Send Inquiry</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsedEquipmentDetail;
