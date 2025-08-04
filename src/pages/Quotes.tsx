import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Database } from '../integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, Info, Trash2, Send, RefreshCw, Check, X } from 'lucide-react';

interface Quote {
  id: string;
  quote_number: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'revised' | 'cancelled';
  created_at: string;
  client_name: string;
  vendor_name?: string;
}

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface QuoteDetails {
  id: string;
  quote_number: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'revised' | 'cancelled';
  created_at: string;
  valid_until?: string;
  total_amount: number;
  notes?: string;
  client_name: string;
  vendor_name?: string;
  items: QuoteItem[];
}

// Assuming your Supabase schema uses snake_case and matches these types
type QuoteRow = Database['public']['Tables']['quotes']['Row'];
type QuoteItemRow = Database['public']['Tables']['quote_items']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

type SupabaseQuote = QuoteRow & {
 client: UserProfileRow | null;
 vendor: UserProfileRow | null;
  items: Database['public']['Tables']['quote_items']['Row'][];
}; 

const Quotes: React.FC = () => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<SupabaseQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [selectedQuoteDetails, setSelectedQuoteDetails] = useState<SupabaseQuote | null>(null);
  const [loadingQuoteDetails, setLoadingQuoteDetails] = useState(false);
  const [errorFetchingQuotes, setErrorFetchingQuotes] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    action: 'send' | 'revise' | 'reject' | 'accept' | null;
    quoteId: string | null;
    title: string;
    description: string;
    icon: React.ReactNode;
    confirmText: string;
    cancelText: string;
  }>({
    isOpen: false,
    action: null,
    quoteId: null,
    title: '',
    description: '',
    icon: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });
  
  // State for editable quote details
  const [editableQuoteDetails, setEditableQuoteDetails] = useState<SupabaseQuote | null>(null);

  const getStatusBadgeVariant = (status: Quote['status']) => {
    switch (status) {
      case 'accepted': return 'default';
      case 'sent': return 'secondary';
      case 'pending': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  // Sync selected quote details with editable state when selectedQuoteDetails changes
  useEffect(() => {
    setEditableQuoteDetails(selectedQuoteDetails);
  }, [selectedQuoteDetails]);

  const handleItemFieldChange = (itemId: string, field: 'quantity' | 'price', value: string) => {
    setEditableQuoteDetails(prevDetails => {
      if (!prevDetails) return null;
      
      const numericValue = parseFloat(value) || 0;
      const updatedItems = prevDetails.items.map(item => 
        item.id === itemId ? { ...item, [field]: numericValue } : item
      );
      
      const totalAmount = updatedItems.reduce((sum, item) => 
        sum + (item.quantity * item.price), 0
      );
      
      return { 
        ...prevDetails, 
        items: updatedItems, 
        total_amount: totalAmount 
      };
    });
  };

  const handleNotesChange = (newNotes: string) => {
    setEditableQuoteDetails(prevDetails => {
      if (!prevDetails) return null;
      return { ...prevDetails, notes: newNotes };
    });
  };

  const handleSendQuote = async (quoteId: string) => {
    if (!quoteId) return;
    
    const { data, error } = await supabase
      .from('quotes')
      .update({ status: 'sent' })
      .eq('id', quoteId)
      .select()
      .single();
      
    if (error) {
      console.error('Error sending quote:', error);
      toast({ 
        title: 'Error', 
        description: `Failed to send quote: ${error.message}`, 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: 'Success', 
        description: 'Quote sent successfully.', 
        variant: 'default' 
      });
    }
  };

  const handleReviseQuote = async (quoteId: string) => {
    if (!quoteId || !editableQuoteDetails) return;
    
    try {
      // Update quote status and notes
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .update({ 
          status: 'revised', 
          notes: editableQuoteDetails.notes, 
          total_amount: editableQuoteDetails.total_amount 
        })
        .eq('id', quoteId)
        .select()
        .single();
        
      if (quoteError) throw quoteError;

      // Update quote items
      const itemUpdates = editableQuoteDetails.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const { error: itemsError } = await supabase.from('quote_items').upsert(itemUpdates, {
        onConflict: 'id'
      });
      if (itemsError) throw itemsError;

      toast({ 
        title: 'Success', 
        description: 'Quote revised successfully.', 
        variant: 'default' 
      });
      
      // Refresh the quote list (realtime updates should handle this, but this is a fallback)
     fetchQuotesList(); // Call the dedicated function to refetch the list
    } catch (error: any) {
      console.error('Error revising quote:', error);
      toast({ 
        title: 'Error', 
        description: `Failed to revise quote: ${error.message}`, 
        variant: 'destructive' 
      });
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    if (!quoteId) return;
    
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('id', quoteId)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({ 
        title: 'Success', 
        description: 'Quote rejected successfully.', 
        variant: 'default' 
      });
      
      // Refresh the quote list
     fetchQuotesList(); // Call the dedicated function to refetch the list
    } catch (error: any) {
      console.error('Error rejecting quote:', error);
      toast({ 
        title: 'Error', 
        description: `Failed to reject quote: ${error.message}`, 
        variant: 'destructive' 
      });
    } 
  };

  const handleAcceptQuote = async (quoteId: string) => {
    if (!quoteId) return;
    
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quoteId)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({ 
        title: 'Success', 
        description: 'Quote accepted successfully.', 
        variant: 'default' 
      });
      
      // Refresh the quote list
     fetchQuotesList(); // Call the dedicated function to refetch the list
      }
    } catch (error: any) {
      console.error('Error accepting quote:', error);
      toast({ 
        title: 'Error', 
        description: `Failed to accept quote: ${error.message}`, 
        variant: 'destructive' 
      });
    }
  };

  const handleSaveEditedQuote = async () => {
    if (!editableQuoteDetails || !selectedQuoteDetails) {
      toast({
        title: 'Error',
        description: 'Missing quote details for saving.',
        variant: 'destructive',
      });
      return;
    }

    // Calculate the new total amount based on edited items
    const newTotalAmount = editableQuoteDetails.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    try {
      // 1. Update the quotes table (notes and total_amount)
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .update({
          notes: editableQuoteDetails.notes,
          total_amount: newTotalAmount, // Use the newly calculated total
          status: 'revised', // Set status to revised on save
        })
        .eq('id', selectedQuoteDetails.id)
        .select()
        .single();

      if (quoteError) {
        throw quoteError;
      }

      // 2. Update quote_items table
      // We can use a Promise.all to update all items concurrently
      const itemUpdates = editableQuoteDetails.items.map(async (item) => {
        // Only update if quantity or price has changed
        const originalItem = selectedQuoteDetails.items.find(orig => orig.id === item.id);
        if (originalItem && (originalItem.quantity !== item.quantity || originalItem.price !== item.price)) {
          const { data: itemData, error: itemError } = await supabase
            .from('quote_items')
            .update({ quantity: item.quantity, price: item.price })
            .eq('id', item.id)
            .select()
            .single();

          if (itemError) {
            throw itemError;
          }
          return itemData;
        }
        return null; // No update needed for this item
      }).filter(update => update !== null); // Filter out null updates

      await Promise.all(itemUpdates as Promise<any>[]);

      // 3. After all updates are successful
      setIsEditing(false);
      // Refetch the quote details to get the latest data including the recalculated total
      // This will be handled by the realtime subscription, but a small delay might be needed
      setTimeout(() => {
        setSelectedQuoteId(selectedQuoteDetails.id); // Trigger refetch of details
      }, 100); // Small delay to allow realtime to potentially update first

      toast({
        title: 'Success',
        description: 'Quote updated successfully.',
        variant: 'default',
      });

    } catch (error: any) {
      console.error('Error saving edited quote:', error);
      toast({
        title: 'Error',
        description: `Failed to save quote: ${error.message}`,
        variant: 'destructive',
      });
      // Optionally, revert editableQuoteDetails to selectedQuoteDetails on error
      setEditableQuoteDetails(selectedQuoteDetails);
    }
  };

  const handleCancelEditing = () => {
    setEditableQuoteDetails(selectedQuoteDetails);
    setIsEditing(false);
  };

  // Function to fetch the list of quotes with related data
 const fetchQuotesList = useCallback(async () => {
    setLoadingQuotes(true);
    setErrorFetchingQuotes(null);

    let query = supabase.from('quotes').select('*');

    // Filter quotes based on user role
    if (userRole === 'customer' && user) {
      query = query.eq('client_id', user.id);
    } else if (['vendor', 'admin', 'super_admin'].includes(userRole || '') && user) {
      query = query.eq('vendor_id', user.id);
    }

    const { data: quotesData, error: quotesError } = await query.order('created_at', { ascending: false });

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError);
      toast({
        title: 'Error',
        description: `Failed to fetch quotes: ${quotesError.message}`,
        variant: 'destructive'
      });
      setErrorFetchingQuotes(quotesError.message);
      setQuotes([]);
      setLoadingQuotes(false);
      return;
    }

    if (!quotesData || quotesData.length === 0) {
      setQuotes([]);
      setLoadingQuotes(false);
      return;
    }

    // Fetch related quote items, clients, and vendors concurrently
    const quotesWithDetails = await Promise.all(quotesData.map(async (quote) => {
      const [itemsResult, clientResult, vendorResult] = await Promise.all([
        supabase.from('quote_items').select('*').eq('quote_id', quote.id),
        supabase.from('user_profiles').select('*').eq('id', quote.client_id).single(),
        supabase.from('user_profiles').select('*').eq('id', quote.vendor_id).single(),
      ]);

      return {
        ...quote,
        items: itemsResult.data || [],
        client: clientResult.data,
        vendor: vendorResult.data,
      };
    }));

    setQuotes(quotesWithDetails as SupabaseQuote[]);
    setLoadingQuotes(false);
 }, [user, userRole, toast]);

  useEffect(() => {
    if (user) {
      fetchQuotesList();
    } else { 
      setQuotes([]);
      setLoadingQuotes(false);
    }
  }, [user, userRole]);

  // Effect to fetch the details of the selected quote
  const fetchQuoteDetails = useCallback(async () => {
    const fetchQuoteDetails = async () => {
      setSelectedQuoteDetails(null);
      setLoadingQuoteDetails(true);
      
      if (!selectedQuoteId) return;
      
      const { data, error } = await supabase
        .from('quotes')
        .select('*, items:quote_items(*), client:user_profiles!quotes_client_id_fkey(full_name), vendor:user_profiles!quotes_vendor_id_fkey(full_name)')
        .eq('id', selectedQuoteId)
        .single();

      if (error) {
        console.error('Error fetching quote details:', error);
        toast({
          title: 'Error', 
          description: `Failed to fetch quote details: ${error.message}`, 
          variant: 'destructive'
        });
        setSelectedQuoteDetails(null);
      } else {
        setSelectedQuoteDetails(data as SupabaseQuote | null);
      }
      
      setLoadingQuoteDetails(false);
    };

    fetchQuoteDetails();
  }, [selectedQuoteId]);

  // Effect for Realtime Subscriptions
  useEffect(() => {
    const quotesChannel = supabase
      .channel('quotes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotes' },
        (payload) => {
          console.log('Quote change received!', payload);
          
          // Refetch the list of quotes on any quote table change
          const fetchQuotes = async () => {
            let query = supabase
              .from('quotes')
              .select('*, client:user_profiles!quotes_client_id_fkey(full_name), vendor:user_profiles!quotes_vendor_id_fkey(full_name)');

            if (userRole === 'customer' && user) {
              query = query.eq('client_id', user.id); 
            } else if (['vendor', 'admin', 'super_admin'].includes(userRole || '') && user) {
              query = query.eq('vendor_id', user.id);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) {
              console.error('Error refetching quotes:', error);
            } else {
              setQuotes(data as SupabaseQuote[] || []);
            }
          };
          
          fetchQuotes();
          
          // If the change is for the currently selected quote, refetch its details
          if (selectedQuoteId && 
              (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') && 
              payload.old?.id === selectedQuoteId) {
            if (payload.eventType === 'DELETE') {
              setSelectedQuoteDetails(null);
              setSelectedQuoteId(null);
            } else {
              fetchQuoteDetails(); // Use the dedicated function
            }
          } else if (selectedQuoteId && 
                     payload.eventType === 'INSERT' && 
                     payload.new?.id === selectedQuoteId) {
            fetchQuoteDetails();
          }
        }
      )
      .subscribe();

    const quoteItemsChannel = supabase
      .channel('quote-items-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote_items' },
        (payload) => {
          console.log('Quote item change received!', payload);
          
          if (selectedQuoteId && 
              (payload.eventType === 'INSERT' || 
               payload.eventType === 'UPDATE' || 
               payload.eventType === 'DELETE') && 
              (payload.new?.quote_id === selectedQuoteId || 
               payload.old?.quote_id === selectedQuoteId)) {
            
            fetchQuoteDetails();
          }
        })
      .subscribe(); 

    // Cleanup function to unsubscribe 
    return () => {
      supabase.removeChannel(quotesChannel);
      supabase.removeChannel(quoteItemsChannel);
    };
  }, [selectedQuoteId, user, userRole]);
  
  const openConfirmationDialog = useCallback((
    action: 'send' | 'revise' | 'reject' | 'accept', 
    quoteId: string
  ) => {
    let title = '';
    let description = '';
    let icon = null;
    let confirmText = 'Confirm';
    let cancelText = 'Cancel';
    
    switch (action) {
      case 'send':
        title = 'Send Quote';
        description = 'Are you sure you want to send this quote to the client? This action cannot be undone.';
        icon = <Send className="h-6 w-6 text-blue-500" />;
        confirmText = 'Send Quote';
        break;
      case 'revise':
        title = 'Revise Quote';
        description = 'Are you sure you want to revise this quote? This will update the quote with your changes.';
        icon = <RefreshCw className="h-6 w-6 text-yellow-500" />;
        confirmText = 'Revise Quote';
        break;
      case 'reject':
        title = 'Reject Quote';
        description = 'Are you sure you want to reject this quote? This action cannot be undone.';
        icon = <X className="h-6 w-6 text-red-500" />;
        confirmText = 'Reject Quote';
        break;
      case 'accept':
        title = 'Accept Quote';
        description = 'Are you sure you want to accept this quote? This will finalize the agreement.';
        icon = <Check className="h-6 w-6 text-green-500" />;
        confirmText = 'Accept Quote';
        break;
    }
    
    setConfirmationDialog({
      isOpen: true,
      action,
      quoteId,
      title,
      description,
      icon,
      confirmText,
      cancelText
    });
  }, []);
  
  const executeConfirmedAction = async () => {
    const { action, quoteId } = confirmationDialog;
    
    if (!action || !quoteId) return;
    
    try {
      switch (action) {
        case 'send':
          await handleSendQuote(quoteId);
          break;
        case 'revise':
          await handleReviseQuote(quoteId);
          break;
        case 'reject':
          await handleRejectQuote(quoteId);
          break;
        case 'accept':
          await handleAcceptQuote(quoteId);
          break;
      }
    } catch (error) {
      console.error(`Error executing ${action} action:`, error);
    } finally {
      setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Quote List */}
      <div className={selectedQuoteDetails ? 'lg:col-span-1' : 'lg:col-span-3'}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">My Quotes</CardTitle>
            {userRole === 'customer' && (
              <Button size="sm">
                New Quote Request
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {userRole !== 'customer' && <TableHead>Client</TableHead>}
                  {(userRole === 'admin' || userRole === 'super_admin') && <TableHead>Vendor</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader> 
              <TableBody>
                {loadingQuotes ? (
                  <TableRow>
                    <TableCell colSpan={userRole !== 'customer' ? (userRole !== 'vendor' ? 5 : 4) : 3} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                        <p className="text-muted-foreground">Loading quotes...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : errorFetchingQuotes ? (
                  <TableRow>
                    <TableCell colSpan={userRole !== 'customer' ? (userRole !== 'vendor' ? 5 : 4) : 3} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                        <p className="text-destructive font-medium">Error Loading Quotes</p>
                        <p className="text-muted-foreground text-sm mt-1">{errorFetchingQuotes}</p>
                        <Button 
                          variant="outline" 
                          className="mt-3"
                          onClick={() => {
                            if (user) fetchQuotesList();
                          }}
                        >
                          Try Again
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userRole !== 'customer' ? (userRole !== 'vendor' ? 5 : 4) : 3} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-muted rounded-full p-3 mb-4">
                          <Info className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">No quotes found</h3>
                        <p className="text-muted-foreground max-w-sm text-center mt-2">
                          {userRole === 'customer' 
                            ? 'You haven\'t requested any quotes yet. Click "New Quote Request" to get started!'
                            : 'There are no quotes to display. Quotes will appear here once they\'re created.'}
                        </p>
                        {userRole === 'customer' && (
                          <Button className="mt-4">
                            New Quote Request
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quote_number}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(quote.status)} className="capitalize">
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(quote.created_at).toLocaleDateString()}</TableCell>
                      {userRole !== 'customer' && <TableCell>{quote.client?.full_name || 'N/A'}</TableCell>}
                      {(userRole === 'admin' || userRole === 'super_admin') && <TableCell>{quote.vendor?.full_name || 'N/A'}</TableCell>}
                      <TableCell>
                        {(userRole === 'vendor' || userRole === 'admin') && quote.status === 'pending' ? (
                          <Button variant="outline" size="sm" onClick={() => setSelectedQuoteId(quote.id)}>
                            Review
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setSelectedQuoteId(quote.id)}>
                            View Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Quote Details (Conditionally displayed) */}
      {selectedQuoteId && selectedQuoteDetails ? (
        <div className="lg:col-span-2">
          <Card className={`h-full overflow-y-auto sticky top-0 ${isEditing ? 'border-blue-500' : ''}`}>
            {/* Edit Button */}
            {(userRole === 'vendor' || userRole === 'admin') && 
             (selectedQuoteDetails.status === 'pending' || selectedQuoteDetails.status === 'revised') && 
             !isEditing && (
              <Button 
                variant="outline" 
                size="sm" 
                className="absolute top-4 right-4" 
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
            
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-bold">
                Quote Details: {selectedQuoteDetails.quote_number}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedQuoteId(null);
                setSelectedQuoteDetails(null);
              }}>
                Close Details
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {loadingQuoteDetails ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Loading quote details...</p>
                </div>
              ) : selectedQuoteDetails ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Quote #:</p>
                      <p className="font-medium">{selectedQuoteDetails.quote_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status:</p>
                      <Badge variant={getStatusBadgeVariant(selectedQuoteDetails.status)} className="capitalize">
                        {selectedQuoteDetails.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created At:</p>
                      <p className="font-medium">{new Date(selectedQuoteDetails.created_at).toLocaleString()}</p>
                    </div>
                    {selectedQuoteDetails.valid_until && (
                      <div>
                        <p className="text-muted-foreground">Valid Until:</p>
                        <p className="font-medium">{new Date(selectedQuoteDetails.valid_until).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Client:</p>
                      <p className="font-medium">{selectedQuoteDetails.client?.full_name || 'N/A'}</p>
                    </div>
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                      <div>
                        <p className="text-muted-foreground">Vendor:</p>
                        <p className="font-medium">{selectedQuoteDetails.vendor?.full_name || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Notes Section */}
                  <div>
                    <p className="text-muted-foreground">Notes:</p>
                    {(userRole === 'vendor' || userRole === 'admin') && 
                     (selectedQuoteDetails.status === 'pending' || selectedQuoteDetails.status === 'revised') && 
                     isEditing ? (
                      <Textarea
                        value={editableQuoteDetails?.notes || ''}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="Add internal notes..." 
                        className="mt-2"
                      />
                    ) : (
                      <p className="mt-2">{selectedQuoteDetails.notes || 'No notes.'}</p>
                    )}
                  </div>
                  
                  <h4 className="text-lg font-semibold mt-6">Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuoteDetails.items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>
                            {isEditing && (userRole === 'vendor' || userRole === 'admin') ? (
                              <Input
                                type="number"
                                value={editableQuoteDetails?.items.find(edi => edi.id === item.id)?.quantity ?? item.quantity}
                                onChange={(e) => handleItemFieldChange(item.id, 'quantity', e.target.value)}
                                className="w-20 mt-1"
                              />
                            ) : (
                              item.quantity
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing && (userRole === 'vendor' || userRole === 'admin') ? (
                              <Input
                                type="number"
                                value={editableQuoteDetails?.items.find(edi => edi.id === item.id)?.price ?? item.price}
                                onChange={(e) => handleItemFieldChange(item.id, 'price', e.target.value)}
                                className="w-20 mt-1"
                              />
                            ) : (
                              `$${item.price.toLocaleString()}`
                            )}
                          </TableCell>
                          <TableCell>${(item.quantity * item.price).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Total Amount */}
                  <div className="text-right text-xl font-bold text-primary mt-6">
                    Total: ${selectedQuoteDetails.total_amount.toLocaleString()}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4 mt-6">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={handleCancelEditing}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEditedQuote}>
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                        {userRole === 'customer' && selectedQuoteDetails.status === 'sent' && (
                          <>
                            <Button 
                              variant="outline" 
                              onClick={() => openConfirmationDialog('reject', selectedQuoteDetails.id)}
                            >
                              Reject Quote
                            </Button>
                            <Button 
                              onClick={() => openConfirmationDialog('accept', selectedQuoteDetails.id)}
                            >
                              Accept Quote
                            </Button>
                          </>
                        )}
                        
                        {(userRole === 'vendor' || userRole === 'admin') && 
                         (selectedQuoteDetails.status === 'pending' || selectedQuoteDetails.status === 'revised') && (
                          <>
                            <Button 
                              variant="outline" 
                              onClick={() => selectedQuoteDetails && openConfirmationDialog('revise', selectedQuoteDetails.id)}
                            >
                              Revise Quote
                            </Button>
                            <Button 
                              onClick={() => selectedQuoteDetails && openConfirmationDialog('send', selectedQuoteDetails.id)}
                            >
                              {selectedQuoteDetails.status === 'pending' ? 'Send Quote' : 'Resend Quote'}
                            </Button>
                          </>
                        )}
                        
                        {(userRole === 'vendor' || userRole === 'admin') && 
                         selectedQuoteDetails.status === 'sent' && (
                          <Button 
                            variant="outline" 
                            onClick={() => selectedQuoteDetails && openConfirmationDialog('reject', selectedQuoteDetails.id)}
                          >
                            Reject Quote
                          </Button>
                        )}
                        
                        {userRole === 'customer' && selectedQuoteDetails.status === 'sent' && (
                          <Button 
                            onClick={() => openConfirmationDialog('accept', selectedQuoteDetails.id)}
                          >
                            Accept Quote
                          </Button>
                        )}
                        
                        {(userRole === 'vendor' || userRole === 'admin') && 
                         selectedQuoteDetails.status === 'sent' && (
                          <Button variant="outline">
                            View as Sent
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>Quote details could not be loaded. The quote may have been deleted.</p>
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => {
                      const fetchQuoteDetails = async () => {
                      fetchQuoteDetails();
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : selectedQuoteId ? (
        <div className="lg:col-span-2 flex items-center justify-center">
          <Card className="w-full">
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Quote Details Unavailable</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  The quote details could not be loaded. This may be because the quote has been deleted 
                  or you don't have permission to view it.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedQuoteId(null);
                      setSelectedQuoteDetails(null);
                    }}
                  >
                    Back to Quotes
                  </Button>
                  <Button 
                    onClick={() => {
                      fetchQuoteDetails();
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialog.isOpen} onOpenChange={(open) => 
        setConfirmationDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmationDialog.icon}
              {confirmationDialog.title}
            </DialogTitle>
            <DialogDescription>
              {confirmationDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
            >
              {confirmationDialog.cancelText}
            </Button>
            <Button 
              variant="destructive" 
              onClick={executeConfirmedAction}
            >
              {confirmationDialog.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Quotes;