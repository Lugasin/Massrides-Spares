import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Assuming you have a Select component
import { Checkbox } from '@/components/ui/checkbox'; // Assuming you have a Checkbox component
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';


// Define Zod schema for product creation validation
const productSchema = z.object({
  name: z.string().min(1, { message: "Product name is required." }),
  description: z.string().optional(),
  price: z.preprocess( // Preprocess to convert string to number
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Price must be a number." }).positive({ message: "Price must be positive." })
  ),
  category_id: z.string().optional(), // Assuming category_id is a UUID string
  vendor_id: z.string().optional(), // This will likely be set from auth context
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.preprocess( // Preprocess to convert string to number
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Year must be a number." }).int({ message: "Year must be an integer." }).optional()
  ),
  condition: z.string().optional(), // Consider using a more specific enum or union type
  availability_status: z.string().optional(), // Consider using a more specific enum or union type
  featured: z.boolean().optional(),
  images: typeof FileList !== 'undefined' ? z.instanceof(FileList).optional() : z.any().optional(), // Use FileList for file uploads
});

type ProductFormValues = z.infer<typeof productSchema>;

const AddProduct: React.FC = () => {
  const { profile, userRole } = useAuth(); // Get profile and role from auth context

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: undefined,
      category_id: undefined,
      vendor_id: profile?.id, // Default vendor_id to authenticated user's profile ID if available
      brand: '',
      model: '',
      year: undefined,
      condition: 'new', // Default condition
      availability_status: 'available', // Default availability status
      featured: false,
      images: undefined,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = form;

  const onSubmit = async (values: ProductFormValues) => {
    // Extract product data (excluding images for the initial backend call)
    const productData = {
      name: values.name,
      description: values.description,
      price: values.price,
      category_id: values.category_id,
      vendor_id: profile?.id, // Ensure vendor_id is set from auth context
      brand: values.brand,
      model: values.model,
      year: values.year,
      condition: values.condition,
      availability_status: values.availability_status,
      featured: values.featured,
      // Image handling will be separate
    };

    // TODO: Handle image file uploads separately to Supabase Storage
    const imageFiles = values.images ? Array.from(values.images) : [];
    console.log('Submitted Image Files:', imageFiles); // Log image files for now

    // Placeholder for backend API call
    try {
      // Simulate a backend API call (replace with your actual Supabase Edge Function call)
      const response = await fetch('/api/products', { // Replace '/api/products' with your actual Edge Function endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization headers if needed (e.g., JWT token)
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }

      // Assuming success response
      toast.success('Product created successfully!');
      reset(); // Reset form after successful submission

    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(`Error creating product: ${error.message}`);
    }
  };

  // Restrict access to vendors, admins, and super admins
  if (!profile || !['vendor', 'admin', 'super_admin'].includes(userRole)) {
      return (
          <div className="container mx-auto px-4 py-8 text-center">
              <h1 className="text-2xl font-bold text-foreground">Permission Denied</h1>
              <p className="text-muted-foreground mt-4">You do not have the necessary permissions to add products.</p>
          </div>
      );
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Add New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                type="text"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-red-500 text-sm">{errors.description.message}</p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register('price')}
              />
              {errors.price && (
                <p className="text-red-500 text-sm">{errors.price.message}</p>
              )}
            </div>

             {/* Category (Example using Select) */}
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              {/* You would typically fetch categories from your database */}
               <Select {...register('category_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {/* Replace with actual category options */}
                  <SelectItem value="category1_id">Category 1</SelectItem>
                  <SelectItem value="category2_id">Category 2</SelectItem>
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-red-500 text-sm">{errors.category_id.message}</p>
              )}
            </div>

            {/* Vendor ID (Hidden or read-only, set from auth context) */}
             {profile?.id && (
                <input type="hidden" {...register('vendor_id')} value={profile.id} />
             )}
            {errors.vendor_id && (
                <p className="text-red-500 text-sm">{errors.vendor_id.message}</p>
              )}


            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                type="text"
                {...register('brand')}
              />
              {errors.brand && (
                <p className="text-red-500 text-sm">{errors.brand.message}</p>
              )}
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                type="text"
                {...register('model')}
              />
              {errors.model && (
                <p className="text-red-500 text-sm">{errors.model.message}</p>
              )}
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                {...register('year')}
              />
              {errors.year && (
                <p className="text-red-500 text-sm">{errors.year.message}</p>
              )}
            </div>

             {/* Condition (Example using Select) */}
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
               <Select {...register('condition')}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select condition" />
                 </SelectTrigger>
                 <SelectContent>
                   {/* Replace with actual condition options */}
                   <SelectItem value="new">New</SelectItem>
                   <SelectItem value="used">Used</SelectItem>
                 </SelectContent>
               </Select>
              {errors.condition && (
                <p className="text-red-500 text-sm">{errors.condition.message}</p>
              )}
            </div>

             {/* Availability Status (Example using Select) */}
            <div className="space-y-2">
              <Label htmlFor="availability_status">Availability Status</Label>
              <Select {...register('availability_status')}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select status" />
                 </SelectTrigger>
                 <SelectContent>
                   {/* Replace with actual status options */}
                   <SelectItem value="available">Available</SelectItem>
                   <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                   <SelectItem value="on_request">On Request</SelectItem>
                 </SelectContent>
               </Select>
              {errors.availability_status && (
                <p className="text-red-500 text-sm">{errors.availability_status.message}</p>
              )}
            </div>


            {/* Featured (Example using Checkbox) */}
            <div className="flex items-center space-x-2">
              <Checkbox id="featured" {...register('featured')} />
              <Label htmlFor="featured">Featured Product</Label>
              {errors.featured && (
                <p className="text-red-500 text-sm">{errors.featured.message}</p>
              )}
            </div>

            {/* Images Upload */}
             <div className="space-y-2">
              <Label htmlFor="images">Product Images</Label>
               <Input
                id="images"
                type="file"
                 multiple // Allow multiple file selection
                accept="image/*" // Accept only image files
                {...register('images')}
               />
              {errors.images && (
                <p className="text-red-500 text-sm">{errors.images.message as string}</p> // Cast to string for FileList error
              )}
            </div>


            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Product...' : 'Create Product'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddProduct;