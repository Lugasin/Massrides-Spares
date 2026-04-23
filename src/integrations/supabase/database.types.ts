export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          diff: Json | null
          id: number
          object_id: string | null
          object_type: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          diff?: Json | null
          id?: number
          object_id?: string | null
          object_type?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          diff?: Json | null
          id?: number
          object_id?: string | null
          object_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      carts: {
        Row: {
          guest_token: string | null
          id: number
          items: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          guest_token?: string | null
          id?: number
          items?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          guest_token?: string | null
          id?: number
          items?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_guest_token_fkey"
            columns: ["guest_token"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["token"]
          }
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_addresses: {
        Row: {
          address: Json | null
          created_at: string | null
          id: number
          label: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          id?: number
          label?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          id?: number
          label?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      guest_sessions: {
        Row: {
          created_at: string | null
          email: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: number
          order_id: number
          price: number
          price_snapshot: number | null
          product_id: number
          quantity: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          order_id: number
          price?: number
          product_id: number
          quantity?: number
        }
        Update: {
          created_at?: string | null
          id?: number
          order_id?: number
          price?: number
          price_snapshot?: number | null
          product_id?: number
          quantity?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          id: number
          order_number: string
          payment_status: string
          shipping_address: Json | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          id?: number
          order_number: string
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          id?: number
          order_number?: string
          payment_status?: string
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: number
          is_default: boolean | null
          label: string | null
          provider: string | null
          provider_customer_id: string | null
          provider_payment_method_ref: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_default?: boolean | null
          label?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_payment_method_ref?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_default?: boolean | null
          label?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_payment_method_ref?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: never
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: never
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          attributes: Json | null
          availability_status: string | null
          brand: string | null
          category_id: number | null
          condition: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          id: number
          images: string[] | null
          is_active: boolean | null
          min_stock_level: number | null
          part_number: string | null
          price: number
          sku: string | null
          stock_quantity: number | null
          title: string
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          attributes?: Json | null
          availability_status?: string | null
          brand?: string | null
          category_id?: number | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: number
          images?: string[] | null
          is_active?: boolean | null
          min_stock_level?: number | null
          part_number?: string | null
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          title: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          attributes?: Json | null
          availability_status?: string | null
          brand?: string | null
          category_id?: number | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: number
          images?: string[] | null
          is_active?: boolean | null
          min_stock_level?: number | null
          part_number?: string | null
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          title?: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          phone: string | null
          role: string
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          metadata?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      vendor_balances: {
        Row: {
          balance: number | null
          pending: number | null
          updated_at: string | null
          vendor_id: number
        }
        Insert: {
          balance?: number | null
          pending?: number | null
          updated_at?: string | null
          vendor_id: number
        }
        Update: {
          balance?: number | null
          pending?: number | null
          updated_at?: string | null
          vendor_id?: number
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          change_type: string
          created_at: string | null
          created_by: string | null
          id: number
          new_quantity: number
          previous_quantity: number
          product_id: number | null
          quantity_change: number
          reason: string | null
          vendor_id: string | null
        }
        Insert: {
          change_type: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          new_quantity: number
          previous_quantity: number
          product_id?: number | null
          quantity_change: number
          reason?: string | null
          vendor_id?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          new_quantity?: number
          previous_quantity?: number
          product_id?: number | null
          quantity_change?: number
          reason?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: number
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendor_payouts: {
        Row: {
          amount: number
          created_at: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          payout_reference: string | null
          status: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          payout_reference?: string | null
          status?: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          payout_reference?: string | null
          status?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      webhooks_log: {
        Row: {
          event_type: string | null
          handled: boolean | null
          handling_notes: string | null
          id: number
          payload: Json | null
          provider: string | null
          received_at: string | null
        }
        Insert: {
          event_type?: string | null
          handled?: boolean | null
          handling_notes?: string | null
          id?: number
          payload?: Json | null
          provider?: string | null
          received_at?: string | null
        }
        Update: {
          event_type?: string | null
          handled?: boolean | null
          handling_notes?: string | null
          id?: number
          payload?: Json | null
          provider?: string | null
          received_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
