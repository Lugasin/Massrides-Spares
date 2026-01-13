import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  part_number: string;
  name: string;
  description: string;
  price: number;
  brand: string;
  condition: string;
  availability_status: string;
  stock_quantity: number;
  min_stock_level: number;
  featured: boolean;
  is_active: boolean;
  images: string[];
  created_at: string;
  category: { name: string };
  vendor: { full_name: string; email: string; company_name: string };
}

const ProductsManagement = () => {
  const { formatCurrency } = useSettings();
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchProducts();
    subscribeToProductUpdates();
  }, [userRole, profile]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('products')
        .select(`
          *,
          title,
          sku,
          category:categories!category_id(name),
          vendor:user_profiles!vendor_id(full_name, email, company_name),
          inventory(quantity)
        `)
        .order('created_at', { ascending: false });

      // Filter based on user role
      if (userRole === 'vendor') {
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('id')
          .eq('owner_id', profile?.id)
          .single();

        if (vendorData) {
          query = query.eq('vendor_id', vendorData.id);
        } else {
          // If no vendor record found, show no products
          setProducts([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedData = data.map((p: any) => ({
        ...p,
        name: p.title,
        part_number: p.sku || '',
        stock_quantity: p.inventory?.[0]?.quantity || 0,
        images: p.main_image ? [p.main_image] : [],
      }));

      setProducts(mappedData || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToProductUpdates = () => {
    const channel = supabase
      .channel('products-management')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spare_parts'
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      toast.success('Product deleted successfully');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !currentStatus } as any)
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.map(p =>
        p.id === productId ? { ...p, is_active: !currentStatus } : p
      ));

      toast.success(`Product ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error('Error toggling product status:', error);
      toast.error('Failed to update product status');
    }
  };

  const handleToggleFeatured = async (productId: string, currentStatus: boolean) => {
    toast.info('Featured status checks are currently disabled pending schema update');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.vendor?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || product.availability_status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category?.name === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'out_of_stock': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'on_order': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'discontinued': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'default';
      case 'out_of_stock': return 'destructive';
      case 'on_order': return 'secondary';
      case 'discontinued': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'} showMetrics={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products Management</h1>
            <p className="text-muted-foreground">
              {userRole === 'vendor' ? 'Manage your products' : 'Manage all products in the system'}
            </p>
          </div>
          {(userRole === 'vendor' || userRole === 'admin' || userRole === 'super_admin') && (
            <Button onClick={() => navigate('/vendor/add-product')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Stock</p>
                  <p className="text-2xl font-bold text-green-500">
                    {products.filter(p => p.availability_status === 'in_stock' && p.is_active).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {products.filter(p => p.stock_quantity <= p.min_stock_level && p.is_active).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Featured</p>
                  <p className="text-2xl font-bold text-primary">
                    {products.filter(p => p.featured && p.is_active).length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="on_order">On Order</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first product'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                              loading="lazy"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">{product.part_number}</p>
                              <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
                              <p className="text-sm text-muted-foreground">Stock: {product.stock_quantity}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline">{product.brand}</Badge>
                            <Badge variant="outline">{product.category?.name || 'No Category'}</Badge>
                            <Badge variant={getStatusColor(product.availability_status)} className="flex items-center gap-1">
                              {getStatusIcon(product.availability_status)}
                              {(product.availability_status || '').replace('_', ' ')}
                            </Badge>
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {product.featured && (
                              <Badge variant="secondary">Featured</Badge>
                            )}
                            {userRole !== 'vendor' && (
                              <Badge variant="outline">{product.vendor?.company_name || 'Unknown Vendor'}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(userRole === 'admin' || userRole === 'super_admin' || product.vendor?.email === user?.email) && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/parts/${product.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(product.id, product.is_active)}
                            >
                              {product.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                            {(userRole === 'admin' || userRole === 'super_admin') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleFeatured(product.id, product.featured)}
                                className="text-yellow-600 hover:text-yellow-700"
                              >
                                ⭐
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product Name</Label>
                    <p className="font-medium">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <Label>Part Number</Label>
                    <p className="font-mono">{selectedProduct.part_number}</p>
                  </div>
                  <div>
                    <Label>Brand</Label>
                    <p>{selectedProduct.brand}</p>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <p>{selectedProduct.category?.name || 'No Category'}</p>
                  </div>
                  <div>
                    <Label>Price</Label>
                    <p className="text-lg font-bold text-primary">{formatCurrency(selectedProduct.price)}</p>
                  </div>
                  <div>
                    <Label>Stock Quantity</Label>
                    <p className={selectedProduct.stock_quantity <= selectedProduct.min_stock_level ? 'text-yellow-600 font-medium' : ''}>
                      {selectedProduct.stock_quantity} units
                    </p>
                  </div>
                  <div>
                    <Label>Condition</Label>
                    <Badge variant="outline" className="capitalize">{selectedProduct.condition}</Badge>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedProduct.availability_status)}
                      <Badge variant={getStatusColor(selectedProduct.availability_status)} className="capitalize">
                        {selectedProduct.availability_status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedProduct.description}</p>
                </div>

                {userRole !== 'vendor' && (
                  <div>
                    <Label>Vendor Information</Label>
                    <div className="mt-1">
                      <p className="font-medium">{selectedProduct.vendor?.company_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedProduct.vendor?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedProduct.vendor?.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Label>Features</Label>
                  <div className="flex gap-2">
                    {selectedProduct.featured && <Badge variant="secondary">Featured</Badge>}
                    {selectedProduct.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedProduct.created_at).toLocaleDateString()} at {new Date(selectedProduct.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ProductsManagement;