import React, { useCallback, useEffect, useState } from 'react';
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

// Define Zod schema for product creation validation
const productSchema = z.object({
  name: z.string().min(1, { message: "Product name is required." }),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Price must be a number." }).positive({ message: "Price must be positive." })
  ),
  sku: z.string().optional(), // Part number -> SKU
  category_id: z.string().optional(),
  brand: z.string().optional(),
  condition: z.string().optional(),
  availability_status: z.enum(['in_stock', 'out_of_stock', 'on_order']).optional(),
  stock_quantity: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number({ invalid_type_error: "Stock quantity must be a number." }).int().min(0)
  ),
  min_stock_level: z.preprocess(
    (val) => (val === '' ? 5 : Number(val)),
    z.number({ invalid_type_error: "Min stock level must be a number." }).int().min(0)
  ),
  featured: z.boolean().optional(),
  main_image: z.string().optional(), // New field for image URL
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

const parseCompatibilityInput = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const serializeCompatibilityValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
};

const AddProduct: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productVendorId, setProductVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!productId;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
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

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  }, []);

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      // Join inventory to get quantity
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', Number(productId))
        .single<any>();

      if (error) throw error;

      if (data) {
        const attributes = typeof data.attributes === 'object' && data.attributes ? data.attributes : {};
        const primaryImage = Array.isArray(data.images) ? data.images[0] || '' : '';
        const stockQuantity = Number(data.stock_quantity ?? 0);
        const minStockLevel = Number(data.min_stock_level ?? (attributes as any)?.min_stock_level ?? 5);

        setProductVendorId(data.vendor_id ? String(data.vendor_id) : profile?.id ?? null);

        reset({
          name: data.title || '',
          description: data.description || '',
          price: Number(data.price ?? 0),
          sku: data.sku || '',
          category_id: data.category_id?.toString() || '',
          main_image: primaryImage,
          stock_quantity: stockQuantity,
          min_stock_level: minStockLevel,
          brand: data.brand || (attributes as any)?.brand || '',
          condition: data.condition || (attributes as any)?.condition || 'new',
          oem_part_number: (attributes as any)?.oem_part_number || '',
          aftermarket_part_number: (attributes as any)?.aftermarket_part_number || '',
          warranty: (attributes as any)?.warranty || '',
          compatibility: serializeCompatibilityValue((attributes as any)?.compatibility),
          featured: Boolean(data.featured ?? ((attributes as any)?.featured === true)),
          availability_status: (data.availability_status as ProductFormValues['availability_status']) || (stockQuantity > 0 ? 'in_stock' : 'out_of_stock')
        });
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product data');
      navigate('/vendor/inventory');
    } finally {
      setLoading(false);
    }
  }, [navigate, productId, profile?.id, reset]);

  useEffect(() => {
    void fetchCategories();

    if (isEditMode) {
      void fetchProduct();
    } else {
      setProductVendorId(null);
    }
  }, [fetchCategories, fetchProduct, isEditMode]);

  const onSubmit = async (values: ProductFormValues) => {
    if (!profile?.id) {
      toast.error('User profile not found');
      return;
    }

    const resolvedVendorId = productVendorId || profile.id;
    if (!resolvedVendorId) {
      toast.error('Product owner could not be determined.');
      return;
    }

    try {
      setLoading(true);

      const sku = values.sku || `${values.brand?.substring(0, 3).toUpperCase() || 'GEN'}-${Date.now().toString().slice(-6)}`;
      const compatibility = parseCompatibilityInput(values.compatibility);
      const nextFeatured = values.featured === true;
      const availabilityStatus =
        values.availability_status === 'on_order'
          ? 'on_order'
          : values.stock_quantity > 0
            ? 'in_stock'
            : 'out_of_stock';

      const attributes = {
        brand: values.brand?.trim() || null,
        condition: values.condition || null,
        oem_part_number: values.oem_part_number?.trim() || null,
        aftermarket_part_number: values.aftermarket_part_number?.trim() || null,
        warranty: values.warranty?.trim() || null,
        compatibility,
        availability_status: availabilityStatus,
        featured: nextFeatured
      };

      const productData = {
        title: values.name.trim(),
        description: values.description?.trim() || null,
        price: values.price,
        sku: sku,
        category_id: values.category_id ? Number(values.category_id) : null,
        vendor_id: resolvedVendorId,
        brand: values.brand?.trim() || null,
        condition: values.condition || null,
        availability_status: availabilityStatus,
        attributes: attributes,
        stock_quantity: values.stock_quantity,
        min_stock_level: values.min_stock_level,
        featured: nextFeatured,
        images: values.main_image?.trim() ? [values.main_image.trim()] : []
      };

      let currentProductId = isEditMode ? Number(productId) : null;

      if (isEditMode && currentProductId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', currentProductId);

        if (error) throw error;
        toast.success('Product updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([{ ...productData, is_active: true }])
          .select()
          .single();

        if (error) throw error;
        currentProductId = data.id;
        toast.success('Product added successfully!');
      }

      // Update Inventory
      if (currentProductId) {
        const inventoryData = {
          product_id: currentProductId,
          vendor_id: resolvedVendorId,
          quantity: values.stock_quantity,
          threshold: values.min_stock_level,
          last_restocked: new Date().toISOString()
        };

        const { error: inventoryError } = await supabase
          .from('inventory' as any)
          .upsert(inventoryData as any, { onConflict: 'product_id' });

        if (inventoryError) {
          console.warn('Inventory sync failed after product save:', inventoryError);
        }
      }

      reset();

      setTimeout(() => {
        navigate('/vendor/inventory');
      }, 1500);

    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} product:`, error);
      toast.error(`Error ${isEditMode ? 'updating' : 'creating'} product: ${error.message}`);
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
          <p className="text-muted-foreground">You need administrative access to manage products.</p>
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
              {/* Image Upload - New! */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="bg-muted/10 p-4 rounded-lg border border-dashed text-center">
                  {/* Image Uploader Component */}
                  <ImageUploader
                    value={watch('main_image') || ''}
                    onChange={(url) => setValue('main_image', url)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Title (was Name) */}
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Engine Oil Filter"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                  )}
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="e.g., John Deere, Kubota"
                    {...register('brand')}
                  />
                  {errors.brand && (
                    <p className="text-destructive text-sm">{errors.brand.message}</p>
                  )}
                </div>

                {/* SKU (was Part Number) */}
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Part Number</Label>
                  <Input
                    id="sku"
                    placeholder="Will auto-generate if empty"
                    {...register('sku')}
                  />
                  {errors.sku && (
                    <p className="text-destructive text-sm">{errors.sku.message}</p>
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
                  {errors.category_id && (
                    <p className="text-destructive text-sm">{errors.category_id.message}</p>
                  )}
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
                  placeholder="Describe the product..."
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
                  placeholder="e.g., John Deere 6400, Kubota M7040"
                  {...register('compatibility')}
                />
              </div>

              {/* Warranty */}
              <div className="space-y-2">
                <Label htmlFor="warranty">Warranty</Label>
                <Input
                  id="warranty"
                  placeholder="e.g., 12 months"
                  {...register('warranty')}
                />
              </div>

              {/* Featured */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={!!watch('featured')}
                  onCheckedChange={(checked) => setValue('featured', !!checked)}
                />
                <Label htmlFor="featured">Featured Product</Label>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="flex-1"
                >
                  {isSubmitting || loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Product' : 'Add Product')}
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
