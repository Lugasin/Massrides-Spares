export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: number
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      carts: {
        Row: {
          id: number
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cart_items: {
        Row: {
          id: number
          cart_id: number
          product_id: number
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          cart_id: number
          product_id: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          cart_id?: number
          product_id?: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      guest_carts: {
        Row: {
          id: number
          session_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          session_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          session_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      guest_cart_items: {
        Row: {
          id: number
          guest_cart_id: number
          product_id: number
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          guest_cart_id: number
          product_id: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          guest_cart_id?: number
          product_id?: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      wishlists: {
        Row: {
          id: number
          user_id: string
          product_id: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          product_id: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number
          created_at?: string
        }
      }
      products: {
        Row: {
          id: number
          vendor_id: string | null
          sku: string | null
          title: string
          description: string | null
          price: number
          currency: string
          active: boolean
          main_image: string | null
          media: Json | null
          category_id: number | null
          attributes: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          vendor_id?: string | null
          sku?: string | null
          title: string
          description?: string | null
          price?: number
          currency?: string
          active?: boolean
          main_image?: string | null
          media?: Json | null
          category_id?: number | null
          attributes?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          vendor_id?: string | null
          sku?: string | null
          title?: string
          description?: string | null
          price?: number
          currency?: string
          active?: boolean
          main_image?: string | null
          media?: Json | null
          category_id?: number | null
          attributes?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
          Row: {
            id: number
            user_id: string
            type: string
            title: string
            message: string
            data: Json | null
            read: boolean
            action_url: string | null
            created_at: string
          }
          Insert: {
            id?: number
            user_id: string
            type: string
            title: string
            message: string
            data?: Json | null
            read?: boolean
            action_url?: string | null
            created_at?: string
          }
          Update: {
            id?: number
            user_id?: string
            type?: string
            title?: string
            message?: string
            data?: Json | null
            read?: boolean
            action_url?: string | null
            created_at?: string
          }
        }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          role: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          role?: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          role?: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
        }
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
  }
}
