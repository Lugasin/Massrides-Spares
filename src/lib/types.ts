// Proper TypeScript types to replace 'any' usage
export interface Product {
  id: number;
  vendor_id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  category_id?: number;
  sku?: string;
  currency: string;
  main_image?: string;
  media: any[]; // JSONB array
  attributes: Record<string, any>; // JSONB object
  created_at: string;
}

export interface CartItemData {
  id: string;
  cart_id?: string;
  product_id: number;
  quantity: number;
  added_at: string;
  user_id?: string;
}

export interface GuestCartItemData {
  id: string;
  guest_cart_id: string;
  product_id: number;
  quantity: number;
  added_at: string;
  guest_session_id: string;
}

export interface UserCart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface GuestCart {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id?: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed';
  total_amount: number;
  shipping_address?: any; // JSONB
  billing_address?: any; // JSONB
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface Inventory {
  id: number;
  product_id: number;
  vendor_id: string;
  quantity: number;
  location: string;
  last_updated: string;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: string;
  vesicash_transaction_id?: string;
  vesicash_payment_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount?: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: any; // JSONB
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  corporate_name: string;
  slug: string;
  contact_email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface CartItemResponse {
  id: string;
  quantity: number;
  product_id: number;
  product?: Product;
}

export interface GuestCartItemResponse {
  id: string;
  quantity: number;
  product_id: number;
  guest_session_id: string;
  product?: Product;
}

// Form types
export interface CheckoutFormData {
  delivery_address: {
    firstName: string;
    lastName: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  payment_method: 'vesicash' | 'card' | 'bank';
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}