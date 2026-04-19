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
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: number
          ip_address: string | null
          log_source: string | null
          logged_by: string | null
          metadata: Json | null
          resource_id: number | null
          resource_type: string | null
          risk_score: number | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: number
          ip_address?: string | null
          log_source?: string | null
          logged_by?: string | null
          metadata?: Json | null
          resource_id?: number | null
          resource_type?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: number
          ip_address?: string | null
          log_source?: string | null
          logged_by?: string | null
          metadata?: Json | null
          resource_id?: number | null
          resource_type?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: number
          product_id: number
          quantity: number
          updated_at: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: number
          product_id: number
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: number
          product_id?: number
          quantity?: number
          updated_at?: string | null
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
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_settings: {
        Row: {
          category_id: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          rate: number
          updated_at: string | null
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rate: number
          updated_at?: string | null
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      financial_audit_logs: {
        Row: {
          amount: number
          created_at: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
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
      inventory: {
        Row: {
          created_at: string | null
          id: number
          last_restocked: string | null
          product_id: number
          quantity: number
          threshold: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_restocked?: string | null
          product_id: number
          quantity?: number
          threshold?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_restocked?: string | null
          product_id?: number
          quantity?: number
          threshold?: number | null
          updated_at?: string | null
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
      notifications: {
        Row: {
          created_at: string | null
          id: number
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: number
          order_id: number
          price: number
          product_id: number
          quantity: number
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
          billing_address: Json | null
          created_at: string | null
          customer_email: string | null
          id: number
          order_number: string
          shipping_address: Json | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          customer_email?: string | null
          id?: number
          order_number: string
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          customer_email?: string | null
          id?: number
          order_number?: string
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
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
      payments: {
        Row: {
          amount_usd: number | null
          amount_zmw: number | null
          base_currency: string | null
          created_at: string | null
          exchange_rate: number | null
          fx_rate_fetched_at: string | null
          fx_rate_locked_at: string | null
          fx_rate_payload: Json | null
          fx_rate_provider: string | null
          fx_rate_source: string | null
          id: string
          order_id: number
          provider: string
          quote_currency: string | null
          status: string
          updated_at: string | null
          vesicash_payment_id: string | null
          vesicash_transaction_id: string | null
        }
        Insert: {
          amount_usd?: number | null
          amount_zmw?: number | null
          base_currency?: string | null
          created_at?: string | null
          exchange_rate?: number | null
          fx_rate_fetched_at?: string | null
          fx_rate_locked_at?: string | null
          fx_rate_payload?: Json | null
          fx_rate_provider?: string | null
          fx_rate_source?: string | null
          id?: string
          order_id: number
          provider?: string
          quote_currency?: string | null
          status?: string
          updated_at?: string | null
          vesicash_payment_id?: string | null
          vesicash_transaction_id?: string | null
        }
        Update: {
          amount_usd?: number | null
          amount_zmw?: number | null
          base_currency?: string | null
          created_at?: string | null
          exchange_rate?: number | null
          fx_rate_fetched_at?: string | null
          fx_rate_locked_at?: string | null
          fx_rate_payload?: Json | null
          fx_rate_provider?: string | null
          fx_rate_source?: string | null
          id?: string
          order_id?: number
          provider?: string
          quote_currency?: string | null
          status?: string
          updated_at?: string | null
          vesicash_payment_id?: string | null
          vesicash_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          id?: number
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
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
          },
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
      system_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string | null
          tags: Json | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string | null
          tags?: Json | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string | null
          tags?: Json | null
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
      user_carts: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
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
          user_id: string
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
          user_id: string
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
          user_id?: string
          vendor_name?: string | null
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
        Relationships: []
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
      commit_inventory_for_product: {
        Args: { p_product_id: number; p_qty: number; p_vendor_id: number }
        Returns: undefined
      }
      create_order_from_cart: {
        Args: {
          _payment_method?: string
          _shipping_address?: Json
          _user_id: string
        }
        Returns: number
      }
      current_user_role: { Args: { user_id: string }; Returns: string }
      get_platform_commission_rate: { Args: never; Returns: number }
      has_role: {
        Args: { required_role: string; user_id: string }
        Returns: boolean
      }
      is_admin_or_super_admin: { Args: { user_id: string }; Returns: boolean }
      record_metric: {
        Args: {
          p_name: string
          p_tags?: Json
          p_unit?: string
          p_value: number
        }
        Returns: undefined
      }
      release_inventory_for_order: {
        Args: { o_id: number }
        Returns: undefined
      }
      reserve_inventory_for_order: {
        Args: { o_id: number }
        Returns: undefined
      }
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
  public: {
    Enums: {},
  },
} as const
