import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SparePart {
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
  category: { name: string };
  created_at: string;
  is_active: boolean;
  main_image: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

const VendorInventory: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (userRole === 'vendor' || userRole === 'admin' || userRole === 'super_admin') {
      fetchVendorParts();
      fetchCategories();
      subscribeToInventoryUpdates();
    }
  }, [userRole, profile]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchVendorParts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories!category_id(name),
          inventory(quantity, location)
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'vendor') {
        if (profile?.id) {
          // Basic filtering logic if needed later
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedParts: SparePart[] = (data || []).map((p: any) => {
        const attrs = p.attributes || {};
        const totalStock = p.inventory?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
        return {
          id: p.id.toString(),
          part_number: p.sku || '',
          name: p.title,
          description: p.description || '',
          price: p.price,
          brand: attrs.brand || '',
          condition: attrs.condition || 'new',
          availability_status: totalStock > 0 ? 'in_stock' : 'out_of_stock',
          stock_quantity: totalStock,
          min_stock_level: attrs.min_stock || 5,
          featured: attrs.featured === true,
          category: { name: p.category?.name || 'Uncategorized' },
          created_at: p.created_at,
          is_active: p.active,
          main_image: p.main_image
        };
      });

      setParts(mappedParts);
    } catch (error: any) {
      console.error('Error fetching parts:', error);
      toast.error(`Failed to fetch inventory: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToInventoryUpdates = () => {
    const channel = supabase
      .channel('vendor-inventory')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => { fetchVendorParts(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDeletePart = async (partId: string) => {
    if (!confirm('Are you sure you want to delete this part?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', parseInt(partId));

      if (error) throw error;
      toast.success('Part deleted successfully');
      fetchVendorParts();
    } catch (error: any) {
      console.error('Error deleting part:', error);
      toast.error(`Failed to delete part: ${error.message}`);
    }
  };

  const handleToggleActive = async (partId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !currentStatus })
        .eq('id', parseInt(partId));

      if (error) throw error;
      toast.success(`Part ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchVendorParts();
    } catch (error: any) {
      console.error('Error toggling part status:', error);
      toast.error('Failed to update part status');
    }
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchTerm ||
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || part.availability_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const lowStockParts = parts.filter(part =>
    part.stock_quantity <= part.min_stock_level && part.is_active
  );

  if (!profile || !['vendor', 'admin', 'super_admin'].includes(userRole)) {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || 'User'}>
        <div className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Vendor Access Required</h2>
          <p className="text-muted-foreground">You need vendor privileges to manage inventory.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Vendor'}>
      <div className="space-y-6">
        {/* Inventory Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Parts</p>
                  <p className="text-2xl font-bold">{parts.length}</p>
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
                  <p className="text-2xl font-bold text-success">
                    {parts.filter(p => p.availability_status === 'in_stock' && p.is_active).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-500">{lowStockParts.length}</p>
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
                    {parts.filter(p => p.featured && p.is_active).length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockParts.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Low Stock Alert</p>
                  <p className="text-sm text-yellow-700">
                    {lowStockParts.length} products are running low on stock and need restocking.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter('in_stock')}
                  className="ml-auto"
                >
                  View Low Stock Items
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Inventory Management</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchVendorParts} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => navigate('/vendor/add-product')}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Part
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts by name, number or brand..."
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
                </SelectContent>
              </Select>
            </div>

            {/* Parts Table */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading inventory...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        {part.main_image ? (
                          <img src={part.main_image} alt={part.name} className="h-8 w-8 object-cover rounded" />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{part.part_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{part.name}</p>
                          {part.featured && (
                            <Badge variant="secondary" className="text-xs mt-1">Featured</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{part.category?.name || 'No Category'}</TableCell>
                      <TableCell>{part.brand}</TableCell>
                      <TableCell>${part.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={part.stock_quantity <= part.min_stock_level ? 'text-yellow-600 font-medium' : ''}>
                            {part.stock_quantity}
                          </span>
                          {part.stock_quantity <= part.min_stock_level && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={part.availability_status === 'in_stock' ? 'default' : 'secondary'}
                            className="capitalize text-xs"
                          >
                            {part.availability_status.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant={part.is_active ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {part.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(userRole === 'admin' || userRole === 'super_admin' || userRole === 'vendor') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/vendor/edit-product/${part.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(part.id, part.is_active)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(userRole === 'admin' || userRole === 'super_admin') && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePart(part.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {filteredParts.length === 0 && !loading && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No parts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Start by adding your first spare part to the inventory.'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => navigate('/vendor/add-product')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Part
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VendorInventory;