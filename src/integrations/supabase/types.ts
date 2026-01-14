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
      categories: {
        Row: {
          id: number
          name: string
          slug: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: number
          product_id: number
          vendor_id: string | null
          quantity: number
          location: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          product_id: number
          vendor_id?: string | null
          quantity: number
          location?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          product_id?: number
          vendor_id?: string | null
          quantity?: number
          location?: string | null
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          email: string | null
          role: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
          created_at: string
          phone: string | null
          company_name: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          website_url: string | null
          avatar_url: string | null
          bio: string | null
          is_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          email?: string | null
          role?: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
          created_at?: string
          phone?: string | null
          company_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          website_url?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          email?: string | null
          role?: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
          created_at?: string
          phone?: string | null
          company_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          website_url?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_verified?: boolean | null
          updated_at?: string | null
        }
      }
      carts: {
        Row: {
          id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          cart_id: string
          product_id: number
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          cart_id: string
          product_id: number
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          cart_id?: string
          product_id?: number
          quantity?: number
          created_at?: string
        }
      }
      guest_carts: {
        Row: {
          id: string
          session_id: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          created_at?: string
        }
      }
      guest_cart_items: {
        Row: {
          id: string
          guest_cart_id: string
          product_id: number
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          guest_cart_id: string
          product_id: number
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          guest_cart_id?: string
          product_id?: number
          quantity?: number
          created_at?: string
        }
      }
      // Legacy mapping for compatibility if needed, but we refactored code to use products.
      // Keeping spare_parts as 'any' to avoid breaking old refs not yet cleaned up
      spare_parts: {
        Row: {
          id: string
          part_number: string
          name: string
          description: string | null
          price: number
          currency: string
          brand: string
          oem_part_number: string | null
          aftermarket_part_number: string | null
          condition: string
          availability_status: string
          stock_quantity: number
          images: string[]
          technical_specs: Json | null
          compatibility: string[] | null
          warranty_months: number | null
          weight: number | null
          dimensions: string | null
          featured: boolean
          tags: string[] | null
          category_id: number | null
          vendor_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
           [key: string]: any
        }
        Update: {
           [key: string]: any
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
