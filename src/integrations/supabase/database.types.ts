export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ads: {
        Row: {
          ad_type: string | null
          clicks: number | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          image_url: string
          impressions: number | null
          start_date: string | null
          status: string | null
          target_url: string | null
          title: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          ad_type?: string | null
          clicks?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url: string
          impressions?: number | null
          start_date?: string | null
          status?: string | null
          target_url?: string | null
          title: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          ad_type?: string | null
          clicks?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string
          impressions?: number | null
          start_date?: string | null
          status?: string | null
          target_url?: string | null
          title?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_cart_items: {
        Row: {
          added_at: string | null
          cart_id: string | null
          id: string | null
          quantity: number | null
          spare_part_id: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          cart_id?: string | null
          id?: string | null
          quantity?: number | null
          spare_part_id?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          cart_id?: string | null
          id?: string | null
          quantity?: number | null
          spare_part_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          id: string | null
          order_number: string | null
          payment_status: string | null
          shipping_address: Json | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          id?: string | null
          order_number?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          id?: string | null
          order_number?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_payments: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          id: string | null
          merchant_reference: string | null
          order_id: string | null
          payment_method: string | null
          provider: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          merchant_reference?: string | null
          order_id?: string | null
          payment_method?: string | null
          provider?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          merchant_reference?: string | null
          order_id?: string | null
          payment_method?: string | null
          provider?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_spare_parts: {
        Row: {
          aftermarket_part_number: string | null
          availability_status: string | null
          brand: string | null
          category_id: string | null
          compatibility: string[] | null
          condition: string | null
          created_at: string | null
          description: string | null
          dimensions: string | null
          featured: boolean | null
          id: string | null
          images: string[] | null
          is_active: boolean | null
          min_stock_level: number | null
          name: string | null
          oem_part_number: string | null
          part_number: string | null
          price: number | null
          stock_quantity: number | null
          tags: string[] | null
          technical_specs: Json | null
          updated_at: string | null
          vendor_id: string | null
          warranty: string | null
          weight: number | null
        }
        Insert: {
          aftermarket_part_number?: string | null
          availability_status?: string | null
          brand?: string | null
          category_id?: string | null
          compatibility?: string[] | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          featured?: boolean | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          min_stock_level?: number | null
          name?: string | null
          oem_part_number?: string | null
          part_number?: string | null
          price?: number | null
          stock_quantity?: number | null
          tags?: string[] | null
          technical_specs?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
          warranty?: string | null
          weight?: number | null
        }
        Update: {
          aftermarket_part_number?: string | null
          availability_status?: string | null
          brand?: string | null
          category_id?: string | null
          compatibility?: string[] | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          featured?: boolean | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          min_stock_level?: number | null
          name?: string | null
          oem_part_number?: string | null
          part_number?: string | null
          price?: number | null
          stock_quantity?: number | null
          tags?: string[] | null
          technical_specs?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
          warranty?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      backup_user_carts: {
        Row: {
          created_at: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string | null
          cart_id: string | null
          id: string
          product_id: number
          quantity: number
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          cart_id?: string | null
          id?: string
          product_id: number
          quantity: number
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          cart_id?: string | null
          id?: string
          product_id?: number
          quantity?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "user_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          parent_id: number | null
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          parent_id?: number | null
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          parent_id?: number | null
          slug?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          order_id: string | null
          reason: string | null
          resolved_at: string | null
          status: string | null
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          reason?: string | null
          resolved_at?: string | null
          status?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          reason?: string | null
          resolved_at?: string | null
          status?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          order_id: number | null
          provider: string | null
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          order_id?: number | null
          provider?: string | null
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          order_id?: number | null
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string
        }
        Relationships: []
      }
      financial_audit_logs: {
        Row: {
          actor_id: string | null
          amount: number | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          amount?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          amount?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      guest_cart_items: {
        Row: {
          added_at: string | null
          guest_cart_id: string
          guest_session_id: string | null
          id: string
          product_id: number
          quantity: number
        }
        Insert: {
          added_at?: string | null
          guest_cart_id: string
          guest_session_id?: string | null
          id?: string
          product_id: number
          quantity: number
        }
        Update: {
          added_at?: string | null
          guest_cart_id?: string
          guest_session_id?: string | null
          id?: string
          product_id?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_cart_items_guest_cart_id_fkey"
            columns: ["guest_cart_id"]
            isOneToOne: false
            referencedRelation: "guest_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_carts: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string | null
          id: number
          last_restocked: string | null
          location: string | null
          product_id: number | null
          quantity: number
          reserved: number
          reserved_until: string | null
          threshold: number
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_restocked?: string | null
          location?: string | null
          product_id?: number | null
          quantity?: number
          reserved?: number
          reserved_until?: string | null
          threshold?: number
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_restocked?: string | null
          location?: string | null
          product_id?: number | null
          quantity?: number
          reserved?: number
          reserved_until?: string | null
          threshold?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          change_type: string
          created_at: string | null
          created_by: string | null
          id: string
          new_quantity: number
          previous_quantity: number
          product_id: number
          quantity_change: number
          reason: string | null
          vendor_id: string | null
        }
        Insert: {
          change_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_quantity: number
          previous_quantity: number
          product_id: number
          quantity_change: number
          reason?: string | null
          vendor_id?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_quantity?: number
          previous_quantity?: number
          product_id?: number
          quantity_change?: number
          reason?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_type: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          price_snapshot: number
          product_id: number
          quantity: number
        }
        Insert: {
          id?: number
          order_id: number
          price_snapshot: number
          product_id: number
          quantity: number
        }
        Update: {
          id?: number
          order_id?: number
          price_snapshot?: number
          product_id?: number
          quantity?: number
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
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          fraud_flag: boolean | null
          id: number
          order_number: string
          payment_status: string
          payout_id: string | null
          payout_status: string | null
          platform_fee: number | null
          shipping_address: Json
          status: string
          total_amount: number
          user_id: string
          vendor_earning: number | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          fraud_flag?: boolean | null
          id?: number
          order_number: string
          payment_status?: string
          payout_id?: string | null
          payout_status?: string | null
          platform_fee?: number | null
          shipping_address: Json
          status?: string
          total_amount: number
          user_id: string
          vendor_earning?: number | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          fraud_flag?: boolean | null
          id?: number
          order_number?: string
          payment_status?: string
          payout_id?: string | null
          payout_status?: string | null
          platform_fee?: number | null
          shipping_address?: Json
          status?: string
          total_amount?: number
          user_id?: string
          vendor_earning?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: number
          order_id: number
          provider: string
          status: string
          vesicash_payment_id: string | null
          vesicash_transaction_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: number
          order_id: number
          provider?: string
          status?: string
          vesicash_payment_id?: string | null
          vesicash_transaction_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: number
          order_id?: number
          provider?: string
          status?: string
          vesicash_payment_id?: string | null
          vesicash_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          status: string | null
          total_amount: number
          total_orders: number | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          total_amount: number
          total_orders?: number | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          total_amount?: number
          total_orders?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json | null
          category_id: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: number
          is_active: boolean | null
          main_image: string | null
          media: Json | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          vendor_id: string
        }
        Insert: {
          attributes?: Json | null
          category_id?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          main_image?: string | null
          media?: Json | null
          name: string
          price: number
          sku?: string | null
          stock_quantity: number
          vendor_id: string
        }
        Update: {
          attributes?: Json | null
          category_id?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          main_image?: string | null
          media?: Json | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string | null
          id: string
          price: number
          product_name: string | null
          quantity: number
          quote_id: string
          spare_part_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          price?: number
          product_name?: string | null
          quantity?: number
          quote_id: string
          spare_part_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          price?: number
          product_name?: string | null
          quantity?: number
          quote_id?: string
          spare_part_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          quote_number: string
          status: string
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
          valid_until: string | null
          vendor_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          quote_number: string
          status?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
          vendor_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          quote_number?: string
          status?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tj_payment_methods: {
        Row: {
          brand: string
          created_at: string | null
          exp_month: number
          exp_year: number
          id: string
          is_default: boolean | null
          last4: string
          payment_method_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string | null
          exp_month: number
          exp_year: number
          id?: string
          is_default?: boolean | null
          last4: string
          payment_method_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string | null
          exp_month?: number
          exp_year?: number
          id?: string
          is_default?: boolean | null
          last4?: string
          payment_method_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tj_payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_carts: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          phone: string | null
          role: string | null
          state: string | null
          updated_at: string | null
          user_id: string
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          role?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          role?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      vendor_media: {
        Row: {
          alt_text: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          tags: string[] | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          tags?: string[] | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          tags?: string[] | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_media_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_orders: {
        Row: {
          created_at: string | null
          id: string
          order_id: number
          status: string
          subtotal: number | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: number
          status?: string
          subtotal?: number | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: number
          status?: string
          subtotal?: number | null
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_users: {
        Row: {
          id: string
          invited_at: string | null
          joined_at: string | null
          role: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_from_cart: {
        Args: {
          _payment_method?: string
          _shipping_address: Json
          _user_id: string
        }
        Returns: string
      }
      get_my_role: { Args: never; Returns: string }
      has_role:
        | { Args: { _role: string }; Returns: boolean }
        | { Args: { _role: string; _user_id?: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      uid: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
