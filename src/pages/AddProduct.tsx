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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Upload } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImageUploader } from '@/components/ImageUploader';

// Define Zod schema for spare part creation
const productSchema = z.object({
  title: z.string().min(1, { message: "Part name is required." }),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Price must be a number." }).positive({ message: "Price must be positive." })
  ),
  sku: z.string().optional(), // part_number
  category_id: z.string().optional(),
  brand: z.string().optional(),
  condition: z.string().optional(),
  availability_status: z.enum(['in_stock', 'out_of_stock', 'on_order']).optional(), // mapped to status/stock
  stock_quantity: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number({ invalid_type_error: "Stock quantity must be a number." }).int().min(0)
  ),
  min_stock_level: z.preprocess(
    (val) => (val === '' ? 5 : Number(val)),
    z.number({ invalid_type_error: "Min stock level must be a number." }).int().min(0)
  ),
  featured: z.boolean().optional(),
  main_image: z.string().optional(),
  warranty: z.string().optional(),
  compatibility: z.string().optional(),
  oem_part_number: z.string().optional(),
  aftermarket_part_number: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface Category {
  id: number;
  name: string;
  description?: string;
}

const AddProduct: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>(); // acts as spare_part_id
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!productId;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      price: undefined,
      sku: '',
      category_id: '',
      brand: '',
      condition: 'new',
      availability_status: 'in_stock',
      stock_quantity: 0,
      min_stock_level: 5,
      featured: false,
      main_image: '',
      warranty: '12 months',
      compatibility: '',
      oem_part_number: '',
      aftermarket_part_number: '',
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = form;

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchProduct();
    }
  }, [isEditMode]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchProduct = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      // Fetch from spare_parts
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      if (data) {
        // Map DB fields to form
        // spare_parts has: name, description, price, part_number, stock_quantity, etc.
        // It also has jsonb 'specifications' or similar if we added them.
        // Let's check schema: columns are id, name, description, price, part_number, category_id, vendor_id, stock_quantity, low_stock_threshold, is_active, images (array), specifications (jsonb)

        // We need to extract 'main_image' from images[0] or similar if we decide that. 
        // Previously we used `images` array. The form uses `main_image`.
        // Let's assume images[0] is main logic for now, or just store a single image in array.
        const mainImg = data.images && data.images.length > 0 ? data.images[0] : '';

        // Extract attributes from specifications jsonb
        const specs = data.specifications || {};

        reset({
          title: data.name,
          description: data.description || '',
          price: data.price,
          sku: data.part_number || '',
          category_id: data.category_id?.toString() || '',
          main_image: mainImg,
          stock_quantity: data.stock_quantity || 0,
          min_stock_level: data.low_stock_threshold || 5,

          // Mapped attributes
          brand: (specs as any)?.brand || '',
          condition: (specs as any)?.condition || 'new',
          oem_part_number: (specs as any)?.oem_part_number || '',
          aftermarket_part_number: (specs as any)?.aftermarket_part_number || '',
          warranty: (specs as any)?.warranty || '',
          compatibility: (specs as any)?.compatibility || '',
          featured: false, // spare_parts doesn't have featured column in basic schema, maybe add to metadata?
          availability_status: (data.stock_quantity || 0) > 0 ? 'in_stock' : 'out_of_stock'
        });
      }
    } catch (error: any) {
      console.error('Error fetching spare part:', error);
      toast.error('Failed to load part data');
      navigate('/vendor/inventory');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    if (!profile?.id) {
      toast.error('User profile not found');
      return;
    }

    try {
      setLoading(true);

      const partNumber = values.sku || `${values.brand?.substring(0, 3).toUpperCase() || 'GEN'}-${Date.now().toString().slice(-6)}`;

      // Store extra fields in JSON specifications
      const specifications = {
        brand: values.brand,
        condition: values.condition,
        oem_part_number: values.oem_part_number,
        aftermarket_part_number: values.aftermarket_part_number,
        warranty: values.warranty,
        compatibility: values.compatibility,
        availability_status: values.availability_status
      };

      const partData = {
        name: values.title,
        description: values.description,
        price: values.price,
        part_number: partNumber,
        category_id: values.category_id ? Number(values.category_id) : null,
        vendor_id: profile.id, // linked to user_profiles.id
        stock_quantity: values.stock_quantity,
        low_stock_threshold: values.min_stock_level,
        is_active: true,
        images: values.main_image ? [values.main_image] : [],
        specifications: specifications,
        // currency is usually system-wide or in specs
      };

      let currentPartId = isEditMode ? productId : null;

      if (isEditMode && currentPartId) {
        const { error } = await supabase
          .from('spare_parts')
          .update(partData)
          .eq('id', currentPartId);

        if (error) throw error;
        toast.success('Spare part updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('spare_parts')
          .insert([partData])
          .select()
          .single();

        if (error) throw error;
        toast.success('Spare part added successfully!');
      }

      reset();

      setTimeout(() => {
        navigate('/vendor/inventory');
      }, 1500);

    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} part:`, error);
      toast.error(`Error ${isEditMode ? 'updating' : 'creating'} part: ${error.message}`);
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
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Spare Part' : 'Add New Spare Part'}</h1>
            <p className="text-muted-foreground">{isEditMode ? 'Update the details of your spare part.' : 'Add a new spare part to your inventory'}</p>
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
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Part Image</Label>
                <div className="bg-muted/10 p-4 rounded-lg border border-dashed text-center">
                  <ImageUploader
                    value={watch('main_image') || ''}
                    onChange={(url) => setValue('main_image', url)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Part Name */}
                <div className="space-y-2">
                  <Label htmlFor="title">Part Name *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Engine Oil Filter"
                    {...register('title')}
                  />
                  {errors.title && (
                    <p className="text-destructive text-sm">{errors.title.message}</p>
                  )}
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="e.g., John Deere"
                    {...register('brand')}
                  />
                </div>

                {/* SKU */}
                <div className="space-y-2">
                  <Label htmlFor="sku">Part Number / SKU</Label>
                  <Input
                    id="sku"
                    placeholder="Auto-generated if empty"
                    {...register('sku')}
                  />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="price">Price (ZMW) *</Label>
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
                  <Label htmlFor="category_id">Category</Label>
                  <Select value={watch('category_id')} onValueChange={(value) => setValue('category_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition */}
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={watch('condition')} onValueChange={(value) => setValue('condition', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
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
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the part..."
                  rows={3}
                  {...register('description')}
                />
              </div>

              {/* Compatibility */}
              <div className="space-y-2">
                <Label htmlFor="compatibility">Compatibility (comma-separated)</Label>
                <Input
                  id="compatibility"
                  placeholder="e.g., John Deere 6400, Kubota M7040"
                  {...register('compatibility')}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="flex-1"
                >
                  {isSubmitting || loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Part' : 'Add Part')}
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