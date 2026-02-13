import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Product {
  id: string;
  name: string;
  price: number;
  vendor_id: string;
}

interface QuoteItem {
  id: string; // Add an id for uniqueness in the list
  productId: string;
  quantity: number;
  vendorId: string;
}

const NewQuoteRequest: React.FC = () => {
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorFetchingProducts, setErrorFetchingProducts] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<QuoteItem[]>([]);
  const [productQuantities, setProductQuantities] = useState<{ [productId: string]: number }>({});
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean | null>(null);
  const [vendorConflict, setVendorConflict] = useState<string | null>(null);

  // Import supabase client
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setVendorConflict(null);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = parseInt(e.target.value, 10);
    if (!isNaN(quantity) && quantity > 0) {
      setQuantity(quantity);
    }
  };

  const handleAddProduct = () => {
    if (selectedProductId && quantity > 0) {
      const selectedProductDetails = availableProducts.find(p => p.id === selectedProductId);

      if (!selectedProductDetails) return;

      // Check for vendor consistency
      if (selectedProducts.length > 0) {
        const currentVendorId = selectedProducts[0].vendorId;
        if (selectedProductDetails.vendor_id !== currentVendorId) {
          setVendorConflict("You can only request a quote from one vendor at a time. Please create a separate quote for items from different vendors.");
          return;
        }
      }

      // Check if the product is already in the list
      const existingItemIndex = selectedProducts.findIndex(item => item.productId === selectedProductId);

      if (existingItemIndex > -1) {
        // Update quantity if product already exists
        const updatedItems = [...selectedProducts];
        updatedItems[existingItemIndex].quantity = quantity;
        setSelectedProducts(updatedItems);
      } else {
        // Add new item if product is not in the list
        setSelectedProducts([...selectedProducts, {
          id: Math.random().toString(36).substring(7),
          productId: selectedProductId,
          quantity,
          vendorId: selectedProductDetails.vendor_id
        }]);
      }

      // Reset selection
      setSelectedProductId('');
      setQuantity(1);
      setVendorConflict(null);
    }
  };

  const handleRemoveItem = (id: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.id !== id));
    if (selectedProducts.length <= 1) {
      setVendorConflict(null);
    }
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    const quantity = parseInt(newQuantity.toString(), 10); // Ensure it's an integer
    if (!isNaN(quantity) && quantity > 0) {
      setSelectedProducts(selectedProducts.map(item =>
        item.id === id ? { ...item, quantity: quantity } : item
      ));
      // Also update the productQuantities state if you are using it for the input fields
      setProductQuantities(prevQuantities => ({
        ...prevQuantities,
        [selectedProducts.find(item => item.id === id)?.productId || '']: quantity
      }));
    }
  };

  // Effect to fetch the list of products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      setErrorFetchingProducts(null);

      const { data, error } = await supabase
        .from('spare_parts')
        .select('id, name, price, vendor_id')
        .eq('is_active', true); // Only active products

      if (error) {
        console.error('Error fetching products:', error);
        setErrorFetchingProducts(error.message);
      } else {
        setAvailableProducts(data as Product[] || []);
      }
      setLoadingProducts(false);
    };
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      alert('Please add at least one product to the quote request.');
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    try {
      // Generate quote number
      const quoteNumber = `Q${Date.now().toString().slice(-8)}`;

      // Get vendor ID from the first item (all items forced to same vendor)
      const vendorId = selectedProducts[0].vendorId;

      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes' as any)
        .insert([{
          quote_number: quoteNumber,
          client_id: (await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
            .maybeSingle()).data?.id,
          vendor_id: vendorId, // Assign to vendor
          status: 'pending'
        }])
        .select('id')
        .single();

      if (quoteError) throw quoteError;

      const quoteId = quoteData.id;

      // Get product details for quote items
      const productDetails = await Promise.all(
        selectedProducts.map(async (item) => {
          const { data: product } = await supabase
            .from('spare_parts')
            .select('name, price')
            .eq('id', item.productId)
            .maybeSingle();
          return product || { name: 'Unknown Product', price: 0 };
        })
      );

      const items = selectedProducts.map((item, index) => ({
        quote_id: quoteId,
        spare_part_id: item.productId,
        product_name: productDetails[index].name,
        quantity: item.quantity,
        price: productDetails[index].price
      }));

      const { error: itemsError } = await supabase
        .from('quote_items' as any)
        .insert(items);

      if (itemsError) throw itemsError;

      setSubmissionSuccess(true);
      setSelectedProducts([]); // Clear the list
      setProductQuantities({}); // Clear quantities
    } catch (error: any) {
      console.error('Error submitting quote request:', error);
      setSubmissionError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {submissionSuccess && (
        <Alert className="mb-4 border-green-500 bg-green-50 text-green-700">
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>Your quote request has been submitted successfully.</AlertDescription>
        </Alert>
      )}
      {submissionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Request a New Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Products</h3>

              {vendorConflict && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Vendor Conflict</AlertTitle>
                  <AlertDescription>{vendorConflict}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                  <Label htmlFor="product">Product</Label>
                  <Select onValueChange={handleProductSelect} value={selectedProductId}>
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.vendor_id ? 'Vendor' : 'No Vendor'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-24">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={handleQuantityChange}
                    disabled={!selectedProductId}
                  />
                </div>
                <div className="self-end mt-2 sm:mt-0">
                  <Button type="button" onClick={handleAddProduct} disabled={!selectedProductId}>Add</Button>
                </div>
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selected Items</h3>
                <div className="border rounded-md divide-y">
                  {selectedProducts.map((item, index) => {
                    const product = availableProducts.find(p => p.id === item.productId);
                    return (
                      <div key={index} className="flex justify-between items-center p-3">
                        <div>
                          <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                          <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`item-quantity-${item.id}`} className="sr-only">Quantity</Label>
                          <Input
                            id={`item-quantity-${item.id}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value, 10))}
                            className="w-16 text-center h-8"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={submitting || selectedProducts.length === 0}>
                {submitting ? 'Submitting...' : 'Submit Quote Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewQuoteRequest;