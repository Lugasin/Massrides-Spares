import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Package, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


// Define Zod schema for spare part creation validation
const sparePartSchema = z.object({
  name: z.string().min(1, { message: "Part name is required." }),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Price must be a number." }).positive({ message: "Price must be positive." })
  ),
  part_number: z.string().min(1, { message: "Part number is required." }),
  category_id: z.string().min(1, { message: "Category is required." }),
  brand: z.string().min(1, { message: "Brand is required." }),
  condition: z.enum(['new', 'used', 'refurbished', 'oem', 'aftermarket']),
  availability_status: z.enum(['in_stock', 'out_of_stock', 'on_order']),
  stock_quantity: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number({ invalid_type_error: "Stock quantity must be a number." }).int().min(0)
  ),
  min_stock_level: z.preprocess(
    (val) => (val === '' ? 5 : Number(val)),
    z.number({ invalid_type_error: "Min stock level must be a number." }).int().min(0)
  ),
  featured: z.boolean().optional(),
  warranty: z.string().optional(),
  compatibility: z.string().optional(),
  oem_part_number: z.string().optional(),
  aftermarket_part_number: z.string().optional(),
});

type SparePartFormValues = z.infer<typeof sparePartSchema>;

interface Category {
  id: string;
  name: string;
  description?: string;
}

const AddProduct: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<SparePartFormValues>({
    resolver: zodResolver(sparePartSchema),
    defaultValues: {
      name: '',
      description: '',
      price: undefined,
      part_number: '',
      category_id: '',
      brand: '',
      condition: 'new',
      availability_status: 'in_stock',
      stock_quantity: 0,
      min_stock_level: 5,
      featured: false,
      warranty: '12 months',
      compatibility: '',
      oem_part_number: '',
      aftermarket_part_number: '',
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = form;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const onSubmit = async (values: SparePartFormValues) => {
    if (!profile?.id) {
      toast.error('User profile not found');
      return;
    }

    try {
      setLoading(true);
      
      // Generate part number if not provided
      const partNumber = values.part_number || `${values.brand.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      
      const sparePartData = {
        name: values.name,
        description: values.description,
        price: values.price,
        part_number: partNumber,
        category_id: values.category_id,
        vendor_id: profile.id,
        brand: values.brand,
        condition: values.condition,
        availability_status: values.availability_status,
        stock_quantity: values.stock_quantity,
        min_stock_level: values.min_stock_level,
        featured: values.featured || false,
        warranty: values.warranty || '12 months',
        compatibility: values.compatibility ? values.compatibility.split(',').map(s => s.trim()) : [],
        oem_part_number: values.oem_part_number,
        aftermarket_part_number: values.aftermarket_part_number,
        is_active: true
      };

      const { data, error } = await supabase
        .from('spare_parts')
        .insert([sparePartData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Spare part added successfully!');
      reset();
      
      // Navigate to vendor inventory or dashboard
      setTimeout(() => {
        navigate('/vendor/inventory');
      }, 1500);

    } catch (error: any) {
      console.error('Error creating spare part:', error);
      toast.error(`Error creating spare part: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Restrict access to vendors, admins, and super admins
  if (!profile || !['vendor', 'admin', 'super_admin'].includes(userRole)) {
    return (
      <DashboardLayout userRole={userRole as any} userName="User">
        <div className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Permission Denied</h2>
          <p className="text-muted-foreground">You need vendor privileges to add spare parts.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Vendor'}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Add New Spare Part</h1>
            <p className="text-muted-foreground">Add a new spare part to your inventory</p>
          </div>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Spare Part Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Part Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Part Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Engine Oil Filter"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                  )}
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Input
                    id="brand"
                    placeholder="e.g., John Deere, Kubota"
                    {...register('brand')}
                  />
                  {errors.brand && (
                    <p className="text-destructive text-sm">{errors.brand.message}</p>
                  )}
                </div>

                {/* Part Number */}
                <div className="space-y-2">
                  <Label htmlFor="part_number">Part Number *</Label>
                  <Input
                    id="part_number"
                    placeholder="Will auto-generate if empty"
                    {...register('part_number')}
                  />
                  {errors.part_number && (
                    <p className="text-destructive text-sm">{errors.part_number.message}</p>
                  )}
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('price')}
                  />
                  {errors.price && (
                    <p className="text-destructive text-sm">{errors.price.message}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category *</Label>
                  <Select value={watch('category_id')} onValueChange={(value) => setValue('category_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && (
                    <p className="text-destructive text-sm">{errors.category_id.message}</p>
                  )}
                </div>

                {/* Condition */}
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Select value={watch('condition')} onValueChange={(value) => setValue('condition', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                      <SelectItem value="oem">OEM</SelectItem>
                      <SelectItem value="aftermarket">Aftermarket</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.condition && (
                    <p className="text-destructive text-sm">{errors.condition.message}</p>
                  )}
                </div>

                {/* Stock Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    {...register('stock_quantity')}
                  />
                  {errors.stock_quantity && (
                    <p className="text-destructive text-sm">{errors.stock_quantity.message}</p>
                  )}
                </div>

                {/* Min Stock Level */}
                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Min Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    min="0"
                    {...register('min_stock_level')}
                  />
                  {errors.min_stock_level && (
                    <p className="text-destructive text-sm">{errors.min_stock_level.message}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the spare part, its features, and applications..."
                  rows={3}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-destructive text-sm">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* OEM Part Number */}
                <div className="space-y-2">
                  <Label htmlFor="oem_part_number">OEM Part Number</Label>
                  <Input
                    id="oem_part_number"
                    placeholder="Original equipment manufacturer part number"
                    {...register('oem_part_number')}
                  />
                </div>

                {/* Aftermarket Part Number */}
                <div className="space-y-2">
                  <Label htmlFor="aftermarket_part_number">Aftermarket Part Number</Label>
                  <Input
                    id="aftermarket_part_number"
                    placeholder="Aftermarket equivalent part number"
                    {...register('aftermarket_part_number')}
                  />
                </div>
              </div>

              {/* Compatibility */}
              <div className="space-y-2">
                <Label htmlFor="compatibility">Compatibility (comma-separated)</Label>
                <Input
                  id="compatibility"
                  placeholder="e.g., John Deere 6400, Kubota M7040, Case IH 5140"
                  {...register('compatibility')}
                />
                <p className="text-sm text-muted-foreground">
                  List compatible equipment models, separated by commas
                </p>
              </div>

              {/* Warranty */}
              <div className="space-y-2">
                <Label htmlFor="warranty">Warranty</Label>
                <Input
                  id="warranty"
                  placeholder="e.g., 12 months, 2 years"
                  {...register('warranty')}
                />
              </div>

              {/* Availability Status */}
              <div className="space-y-2">
                <Label htmlFor="availability_status">Availability Status</Label>
                <Select value={watch('availability_status')} onValueChange={(value) => setValue('availability_status', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="on_order">On Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Featured */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="featured" 
                  checked={watch('featured')}
                  onCheckedChange={(checked) => setValue('featured', !!checked)}
                />
                <Label htmlFor="featured">Featured Part</Label>
                <p className="text-sm text-muted-foreground">
                  Featured parts appear prominently in search results
                </p>
              </div>

              <div className="flex gap-4 pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || loading}
                  className="flex-1"
                >
                  {isSubmitting || loading ? 'Adding Part...' : 'Add Spare Part'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/vendor/inventory')}
                  disabled={isSubmitting || loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddProduct;