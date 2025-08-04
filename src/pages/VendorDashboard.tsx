import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  ShoppingCart, 
  DollarSign,
  Plus,
  Edit,
  ImageIcon,
  Upload
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  brand?: string;
  model?: string;
  condition: string;
  availability_status: string;
  featured: boolean;
  images?: string[];
  created_at: string;
}

interface ProductForm {
  name: string;
  description: string;
  price: number;
  brand: string;
  model: string;
  condition: string;
  availability_status: string;
  featured: boolean;
}

const VendorDashboard: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [productForm, setProductForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: 0,
    brand: '',
    model: '',
    condition: 'new',
    availability_status: 'available',
    featured: false
  });

  useEffect(() => {
    if (userRole === 'vendor') {
      fetchVendorProducts();
    }
  }, [userRole]);

  const fetchVendorProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        ...productForm,
        vendor_id: profile?.id
      };

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success('Product created successfully');
      }

      // Reset form and fetch products
      setProductForm({
        name: '',
        description: '',
        price: 0,
        brand: '',
        model: '',
        condition: 'new',
        availability_status: 'available',
        featured: false
      });
      setShowAddForm(false);
      setEditingProduct(null);
      fetchVendorProducts();

    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Failed to save product: ${error.message}`);
    }
  };

  const handleEditProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      brand: product.brand || '',
      model: product.model || '',
      condition: product.condition,
      availability_status: product.availability_status,
      featured: product.featured
    });
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      toast.success('Product deleted successfully');
      fetchVendorProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(`Failed to delete product: ${error.message}`);
    }
  };

  if (userRole !== 'vendor') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Vendor Access Required</h2>
          <p className="text-muted-foreground">You need vendor privileges to access this dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Vendor'}>
        <div className="p-6 text-center">Loading vendor dashboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Vendor'}>
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Featured Products</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.featured).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Product Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${products.length > 0 ? 
                  (products.reduce((sum, p) => sum + p.price, 0) / products.length).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : 
                  '0'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Product Management</CardTitle>
            <Button 
              onClick={() => {
                setShowAddForm(true);
                setEditingProduct(null);
                setProductForm({
                  name: '',
                  description: '',
                  price: 0,
                  brand: '',
                  model: '',
                  condition: 'new',
                  availability_status: 'available',
                  featured: false
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </CardHeader>
          <CardContent>
            {showAddForm && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitProduct} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={productForm.name}
                          onChange={(e) => setProductForm(prev => ({...prev, name: e.target.value}))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price *</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand">Brand</Label>
                        <Input
                          id="brand"
                          value={productForm.brand}
                          onChange={(e) => setProductForm(prev => ({...prev, brand: e.target.value}))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={productForm.model}
                          onChange={(e) => setProductForm(prev => ({...prev, model: e.target.value}))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={productForm.description}
                        onChange={(e) => setProductForm(prev => ({...prev, description: e.target.value}))}
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-4 items-center">
                      <div>
                        <Label htmlFor="condition">Condition</Label>
                        <select
                          id="condition"
                          value={productForm.condition}
                          onChange={(e) => setProductForm(prev => ({...prev, condition: e.target.value}))}
                          className="block w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                        >
                          <option value="new">New</option>
                          <option value="used">Used</option>
                          <option value="refurbished">Refurbished</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="availability">Availability</Label>
                        <select
                          id="availability"
                          value={productForm.availability_status}
                          onChange={(e) => setProductForm(prev => ({...prev, availability_status: e.target.value}))}
                          className="block w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                        >
                          <option value="available">Available</option>
                          <option value="out_of_stock">Out of Stock</option>
                          <option value="discontinued">Discontinued</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2 mt-6">
                        <input
                          type="checkbox"
                          id="featured"
                          checked={productForm.featured}
                          onChange={(e) => setProductForm(prev => ({...prev, featured: e.target.checked}))}
                          className="rounded border-input"
                        />
                        <Label htmlFor="featured">Featured Product</Label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit">
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingProduct(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Products Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>${product.price.toLocaleString()}</TableCell>
                    <TableCell>{product.brand || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {product.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={product.availability_status === 'available' ? 'default' : 'secondary'}
                      >
                        {product.availability_status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.featured && <Badge variant="outline">Featured</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {products.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your first product to the catalog.
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VendorDashboard;