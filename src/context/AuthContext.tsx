import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { mergeGuestCart } from '@/lib/supabase'
import { toast } from 'sonner'

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  phone?: string
  address?: string
  company_name?: string
  role: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
  hasPermission: (permission: string) => boolean
  isAdmin: boolean
  userRole: string
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  updateProfile: async () => ({ error: null }),
  hasPermission: () => false,
  isAdmin: false,
  userRole: 'guest'
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [userRole, setUserRole] = useState<string>('guest')

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await loadUserProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Merge guest cart if exists
          await mergeGuestCart()
          await loadUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
          setUserPermissions([])
          setUserRole('guest')
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      // Get user profile - simplified since we don't have roles/permissions tables yet
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        console.error('Error loading user profile:', profileError)
        return
      }

      if (profileData) {
        setProfile(profileData)
        setUserRole(profileData.role || 'customer')
        
        // Set basic permissions based on role
        const rolePermissions: Record<string, string[]> = {
          'super_admin': ['all'],
          'admin': ['view_dashboard', 'manage_products', 'manage_orders'],
          'vendor': ['manage_own_products', 'view_own_orders'],
          'customer': ['place_orders', 'view_own_orders']
        }
        
        setUserPermissions(rolePermissions[profileData.role] || [])
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error)
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            phone: userData.phone,
            company_name: userData.company_name
          }
        }
      })
      
      if (error) {
        toast.error(`Registration failed: ${error.message}`)
        return { error }
      }
      
      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Registration successful! Please check your email to confirm your account.')
      } else if (data.user) {
        toast.success('Registration successful! You can now sign in.')
      }
      
      return { error: null }
    } catch (error: any) {
      toast.error(`Registration failed: ${error.message}`)
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        toast.error(`Sign in failed: ${error.message}`)
        return { error }
      }
      
      if (data.user) {
        toast.success('Welcome back!')
        // Merge guest cart if exists
        await mergeGuestCart()
      }
      
      return { error: null }
    } catch (error: any) {
      toast.error(`Sign in failed: ${error.message}`)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast.error(`Sign out failed: ${error.message}`)
      } else {
        toast.success('Signed out successfully')
      }
      
      return { error }
    } catch (error: any) {
      toast.error(`Sign out failed: ${error.message}`)
      return { error }
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null)
    }

    return { error }
  }

  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission) || userPermissions.includes('all')
  }

  const isAdmin = hasPermission('view_dashboard') || userRole === 'admin' || userRole === 'super_admin'

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    hasPermission,
    isAdmin,
    userRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}