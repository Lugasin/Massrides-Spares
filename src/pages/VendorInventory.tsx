import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw
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
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface NewPartForm {
  name: string;
  description: string;
  price: number;
  brand: string;
  condition: string;
  stock_quantity: number;
  min_stock_level: number;
  category_id: string;
  featured: boolean;
  part_number: string;
}

const VendorInventory: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [newPartForm, setNewPartForm] = useState<NewPartForm>({
    name: '',
    description: '',
    price: 0,
    brand: '',
    condition: 'new',
    stock_quantity: 0,
    min_stock_level: 5,
    category_id: '',
    featured: false,
    part_number: ''
  });

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
        .order('sort_order');

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
        .from('spare_parts')
        .select(`
          *,
          category:categories!category_id(name)
        `)
        .order('created_at', { ascending: false });

      // Filter based on user role
      if (userRole === 'vendor') {
        query = query.eq('vendor_id', profile?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setParts(data || []);
    } catch (error: any) {
      console.error('Error fetching parts:', error);
      toast.error(`Failed to fetch inventory: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToInventoryUpdates = () => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('vendor-inventory')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spare_parts',
          filter: userRole === 'vendor' ? `vendor_id=eq.${profile.id}` : undefined
        },
        () => {
          fetchVendorParts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitPart = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      toast.error('User profile not found');
      return;
    }

    try {
      setSubmitting(true);
      
      // Generate part number if not provided
      const partNumber = newPartForm.part_number || 
        `${newPartForm.brand.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      
      const partData = {
        ...newPartForm,
        part_number: partNumber,
        vendor_id: profile.id,
        is_active: true,
        availability_status: newPartForm.stock_quantity > 0 ? 'in_stock' : 'out_of_stock'
      };

      if (editingPart) {
        // Update existing part
        const { error } = await supabase
          .from('spare_parts')
          .update(partData)
          .eq('id', editingPart.id);

        if (error) throw error;
        toast.success('Part updated successfully');
      } else {
        // Create new part
        const { error } = await supabase
          .from('spare_parts')
          .insert([partData]);

        if (error) throw error;
        toast.success('Part added successfully');
      }

      resetForm();
      fetchVendorParts();
    } catch (error: any) {
      console.error('Error saving part:', error);
      toast.error(`Failed to save part: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewPartForm({
      name: '',
      description: '',
      price: 0,
      brand: '',
      condition: 'new',
      stock_quantity: 0,
      min_stock_level: 5,
      category_id: '',
      featured: false,
      part_number: ''
    });
    setShowAddDialog(false);
    setEditingPart(null);
  };

  const handleEditPart = (part: SparePart) => {
    setNewPartForm({
      name: part.name,
      description: part.description,
      price: part.price,
      brand: part.brand,
      condition: part.condition,
      stock_quantity: part.stock_quantity,
      min_stock_level: part.min_stock_level,
      category_id: '', // Would need to get from part.category
      featured: part.featured,
      part_number: part.part_number
    });
    setEditingPart(part);
    setShowAddDialog(true);
  };

  const handleDeletePart = async (partId: string) => {
    if (!confirm('Are you sure you want to delete this part?')) return;

    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', partId);

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
        .from('spare_parts')
        .update({ is_active: !currentStatus })
        .eq('id', partId);

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
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Part
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPart ? 'Edit Spare Part' : 'Add New Spare Part'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitPart} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Part Name *</Label>
                        <Input
                          id="name"
                          value={newPartForm.name}
                          onChange={(e) => setNewPartForm(prev => ({...prev, name: e.target.value}))}
                          placeholder="e.g., Engine Oil Filter"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand">Brand *</Label>
                        <Input
                          id="brand"
                          value={newPartForm.brand}
                          onChange={(e) => setNewPartForm(prev => ({...prev, brand: e.target.value}))}
                          placeholder="e.g., John Deere, Kubota"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="part_number">Part Number</Label>
                        <Input
                          id="part_number"
                          value={newPartForm.part_number}
                          onChange={(e) => setNewPartForm(prev => ({...prev, part_number: e.target.value}))}
                          placeholder="Will auto-generate if empty"
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price (USD) *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPartForm.price}
                          onChange={(e) => setNewPartForm(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Select 
                          value={newPartForm.category_id} 
                          onValueChange={(value) => setNewPartForm(prev => ({...prev, category_id: value}))}
                        >
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
                      </div>
                      <div>
                        <Label htmlFor="condition">Condition *</Label>
                        <Select 
                          value={newPartForm.condition} 
                          onValueChange={(value) => setNewPartForm(prev => ({...prev, condition: value}))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="used">Used</SelectItem>
                            <SelectItem value="refurbished">Refurbished</SelectItem>
                            <SelectItem value="oem">OEM</SelectItem>
                            <SelectItem value="aftermarket">Aftermarket</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="stock">Stock Quantity *</Label>
                        <Input
                          id="stock"
                          type="number"
                          min="0"
                          value={newPartForm.stock_quantity}
                          onChange={(e) => setNewPartForm(prev => ({...prev, stock_quantity: parseInt(e.target.value) || 0}))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="minStock">Min Stock Level</Label>
                        <Input
                          id="minStock"
                          type="number"
                          min="0"
                          value={newPartForm.min_stock_level}
                          onChange={(e) => setNewPartForm(prev => ({...prev, min_stock_level: parseInt(e.target.value) || 5}))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newPartForm.description}
                        onChange={(e) => setNewPartForm(prev => ({...prev, description: e.target.value}))}
                        placeholder="Describe the spare part, its features, and applications..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={newPartForm.featured}
                        onChange={(e) => setNewPartForm(prev => ({...prev, featured: e.target.checked}))}
                        className="rounded border-input"
                      />
                      <Label htmlFor="featured">Featured Part</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        type="submit" 
                        disabled={submitting}
                        className="flex-1"
                      >
                        {submitting ? 'Saving...' : (editingPart ? 'Update Part' : 'Add Part')}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetForm}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts..."
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditPart(part)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
                  <Button onClick={() => setShowAddDialog(true)}>
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