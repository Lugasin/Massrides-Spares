import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface Product {
  // Assuming your product table has these fields
  id: string;
  name: string;
  price: number;
}

interface QuoteItem {
  id: string; // Add an id for uniqueness in the list
  productId: string;
  quantity: number;
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

  // Import supabase client
  // Assuming you have a useSupabaseClient hook or similar to get the client instance
  // import { useSupabaseClient } from '@/hooks/use-supabase-client'; // Example import
  // const supabase = useSupabaseClient();
  const { supabase } = require('@/lib/supabase'); // Using require for now based on provided code
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const handleAddProduct = () => {
    if (selectedProductId && quantity > 0) {
    productId: '',
    if (newProductSelection.productId && newProductSelection.quantity > 0) {
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = parseInt(e.target.value, 10);
    if (!isNaN(quantity) && quantity > 0) {
      setQuantity(quantity);
    }
  };

  const handleAddItem = () => {
    if (selectedProductId && quantity > 0) {
      // Check if the product is already in the list
      const existingItemIndex = selectedProducts.findIndex(item => item.productId === selectedProductId);

      if (existingItemIndex > -1) {
        // Update quantity if product already exists and new quantity is valid
        const updatedItems = [...selectedProducts];
        updatedItems[existingItemIndex].quantity = quantity; // Replace quantity
        setSelectedProducts(updatedItems);
      } else {
        // Add new item if product is not in the list with a unique temporary id
        setSelectedProducts([...selectedProducts, { id: Math.random().toString(36).substring(7), productId: selectedProductId, quantity }]);
      }

      // Reset selection
      setSelectedProductId('');
      setQuantity(1);
      // Clear the select value (if possible or manage it manually)
    }
  };

  // Effect to fetch the list of products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      setErrorFetchingProducts(null);

      const { data, error } = await supabase
        .from('products') // Assuming your products table is named 'products'
        .select('id, name, price'); // Select relevant fields

      if (error) {
        console.error('Error fetching products:', error);
        setErrorFetchingProducts(error.message);
      } else {
        setAvailableProducts(data as Product[] || []);
      }
      setLoadingProducts(false);
    };
    fetchProducts();
  }, []); // Fetch products only once on component mount

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
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          // client_id will be automatically set by RLS if using auth.uid()
          // status defaults to 'pending'
          // created_at defaults to now()
        }])
        .select('id')
        .single();

      if (quoteError) throw quoteError;

      const quoteId = quoteData.id;
      const quoteItemsToInsert = selectedProducts.map(item => ({
        quote_id: quoteId,
        product_id: item.productId,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(quoteItemsToInsert);

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

  const handleRemoveItem = (id: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    const quantity = parseInt(newQuantity.toString(), 10); // Ensure it's an integer
    if (!isNaN(quantity) && quantity > 0) {
      setSelectedProducts(selectedProducts.map(item =>
        item.id === id ? { ...item, quantity: quantity } : item
      ));
      // Also update the productQuantities state if you are using it for the input fields
      setProductQuantities(prevQuantities => ({
        ...prevQuantities, [selectedProducts.find(item => item.id === id)?.productId || '']: quantity
      ));
    }
  };


  return (
    <div className="container mx-auto px-4 py-8">
      {submissionSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> Your quote request has been submitted.</span>
        </div>
      )}
      {submissionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {submissionError}</span>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Request a New Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Products</h3>
              <div className="flex gap-4">
                <div className="flex-grow">
                  <Label htmlFor="product">Product</Label>
                  <Select onValueChange={handleProductSelect} value={newProductSelection.productId}>
                  <Select onValueChange={handleProductSelect} value={selectedProductId}>
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map(product => (
                        // Ensure product.id and product.name exist
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>



                  </Select>
                </div>
                <div className="w-24">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
 min="1"
                    value={quantity}
                    onChange={handleQuantityChange}
                    disabled={!selectedProductId} // Disable quantity if no product is selected
 />
                </div>
                <div className="self-end">
                  <Button type="button" onClick={handleAddProduct}>Add Product</Button>
                </div>
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selected Items</h3>
                <ul>
                  {selectedProducts.map((item, index) => {
                    const product = availableProducts.find(p => p.id === item.productId); // Find the product details
                    return (
                      <li key={index} className="flex justify-between items-center border-b py-2">
                        <span className="font-medium">{product?.name || 'Unknown Product'}</span>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`item-quantity-${item.id}`} className="sr-only">Quantity</Label>
                          <Input
                            id={`item-quantity-${item.id}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value, 10))}
                            className="w-16 text-center"
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button type="submit">Submit Quote Request</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewQuoteRequest;