import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { mergeGuestCart } from '@/lib/supabase'
import { toast } from 'sonner'
import { logAuthEvent, logProfileEvent } from '@/lib/activityLogger'

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  company_name?: string
  role: 'super_admin' | 'admin' | 'vendor' | 'customer' | 'guest'
  website_url?: string
  avatar_url?: string
  bio?: string
  is_verified?: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  ready: boolean
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
  hasPermission: (permission: string) => boolean
  isAdmin: boolean
  userRole: string
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  ready: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  updateProfile: async () => ({ error: null }),
  hasPermission: () => false,
  isAdmin: false,
  userRole: 'guest',
  refreshProfile: async () => {}
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
  const [ready, setReady] = useState(false)
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
      } else {
        setReady(true)
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
          try {
            console.log('AuthContext: SIGNED_IN event triggered');
            // Merge guest cart if exists
            console.log('AuthContext: Merging guest cart...');
            await mergeGuestCart()
            console.log('AuthContext: Guest cart merged.');
            console.log('AuthContext: Loading user profile...');
            await loadUserProfile(session.user.id)
            console.log('AuthContext: User profile loaded.');
          } catch (error) {
            console.error('Error during sign in processing:', error)
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('AuthContext: TOKEN_REFRESHED event triggered');
          await loadUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
          setUserPermissions([])
          setUserRole('guest')
          setReady(false)
          // Clear any stored session data
          localStorage.removeItem('user_role')
          localStorage.removeItem('guest_session_id')
        }
        
        setLoading(false)
        setReady(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (userError) {
        console.error('Error loading user profile:', userError)
        return
      }

      const profileData: UserProfile = {
        id: userData.id,
        user_id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone,
        company_name: userData.company_name || '',
        address: userData.address || '',
        city: userData.city || '',
        state: userData.state || '',
        zip_code: userData.zip_code || '',
        country: userData.country || 'Zambia',
        website_url: userData.website_url || '',
        avatar_url: userData.avatar_url || '',
        bio: userData.bio || '',
        role: userData.role as UserProfile['role'],
        is_verified: userData.is_verified || false,
        created_at: userData.created_at,
        updated_at: userData.updated_at || userData.created_at
      }

      setProfile(profileData)
      setUserRole(userData.role || 'customer')
      localStorage.setItem('user_role', userData.role || 'customer')
      
      // Set basic permissions based on role
      const rolePermissions: Record<string, string[]> = {
        'super_admin': ['all'],
        'admin': ['view_dashboard', 'manage_products', 'manage_orders', 'manage_users'],
        'vendor': ['manage_own_products', 'view_own_orders', 'manage_inventory'],
        'customer': ['place_orders', 'view_own_orders', 'request_quotes'],
        'guest': ['browse_catalog', 'guest_checkout']
      }
      
      setUserPermissions(rolePermissions[userData.role] || [])
      setReady(true)
    } catch (error) {
      console.error('Error in loadUserProfile:', error)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
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
          },
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      })
      
      if (error) {
        toast.error(`Registration failed: ${error.message}`)
        return { error }
      }
      
      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Registration successful! Please check your email to verify your account.')
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
        
        // Log successful login
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single();
        
        if (userProfile) {
          logAuthEvent('login', userProfile.id, { email: data.user.email });
        }
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
        
        // Log successful logout
        if (profile) {
          logAuthEvent('logout', profile.id);
        }
        
        // Clear local storage
        localStorage.removeItem('user_role')
        localStorage.removeItem('guest_session_id')
        
        // Navigate to home after logout
        window.location.href = '/';
      }
      
      return { error }
    } catch (error: any) {
      toast.error(`Sign out failed: ${error.message}`)
      return { error }
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: updates.full_name,
          phone: updates.phone,
          company_name: updates.company_name,
          address: updates.address,
          city: updates.city,
          state: updates.state,
          zip_code: updates.zip_code,
          country: updates.country,
          website_url: updates.website_url,
          avatar_url: updates.avatar_url,
          bio: updates.bio,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) {
        toast.error(`Failed to update profile: ${error.message}`)
        return { error }
      }

      // Refresh profile data
      await refreshProfile()
      toast.success('Profile updated successfully!')
      
      // Log profile update
      if (profile) {
        logProfileEvent('profile_updated', profile.id, updates);
      }
      
      return { error: null }
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`)
      return { error }
    }
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
    ready,
    signUp,
    signIn,
    signOut,
    updateProfile,
    hasPermission,
    isAdmin,
    userRole,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}