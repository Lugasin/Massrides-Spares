
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/lib/logger'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: any | null
  loading: boolean
  ready: boolean
  userPermissions: string[]
  userRole: string
  refreshProfile: () => Promise<void>
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
  isVendor: () => boolean
  signOut: () => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  ready: false,
  userPermissions: [],
  userRole: 'guest',
  refreshProfile: async () => { },
  hasPermission: () => false,
  isAdmin: () => false,
  isVendor: () => false,
  signOut: async () => ({ error: null }),
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [userRole, setUserRole] = useState<string>('guest')
  const [retryCount, setRetryCount] = useState(0)

  const loadUserProfile = useCallback(async (userId: string): Promise<boolean> => {
    try {
      logger.log('AuthContext: Loading user profile for', userId)

      // First try by user_id (correct foreign key relationship)
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        logger.error('AuthContext: Profile load error:', error)
        // Don't throw - handle gracefully
        setProfile(null)
        setUserRole('guest')
        setUserPermissions([])
        return false
      }

      if (profileData) {
        logger.log('AuthContext: Profile loaded successfully')
        setProfile(profileData)
        setUserRole(profileData.role || 'customer')
        // Set permissions based on role
        const permissions = getPermissionsForRole(profileData.role || 'customer')
        setUserPermissions(permissions)
        return true
      }

      // If no profile found, user might be new - don't create automatically
      logger.warn('AuthContext: No profile found for user')
      setProfile(null)
      setUserRole('guest')
      setUserPermissions([])
      return false

    } catch (error) {
      logger.error('AuthContext: Unexpected error loading profile:', error)
      setProfile(null)
      setUserRole('guest')
      setUserPermissions([])
      return false
    }
  }, [])

  const getPermissionsForRole = (role: string): string[] => {
    switch (role) {
      case 'super_admin':
        return ['read', 'write', 'delete', 'admin', 'manage_users', 'manage_orders', 'view_analytics']
      case 'admin':
        return ['read', 'write', 'delete', 'manage_orders', 'view_analytics']
      case 'vendor':
        return ['read', 'write', 'manage_own_products', 'view_own_orders']
      case 'customer':
        return ['read', 'write_own']
      default:
        return []
    }
  }

  const handleAuthError = useCallback(async (error: any, event: string) => {
    logger.warn(`AuthContext: ${event} - ${error?.message || 'Unknown error'}`)

    // Clear all state
    setSession(null)
    setUser(null)
    setProfile(null)
    setUserRole('guest')
    setUserPermissions([])

    // For token refresh failures, try to refresh once more
    if (event === 'TOKEN_REFRESH_FAILED' && retryCount < 1) {
      logger.log('AuthContext: Attempting token refresh retry')
      setRetryCount(prev => prev + 1)
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        if (!refreshError && data.session) {
          logger.log('AuthContext: Token refresh successful')
          setSession(data.session)
          setUser(data.session.user)
          await loadUserProfile(data.session.user.id)
          setRetryCount(0) // Reset on success
          return
        }
      } catch (refreshError) {
        logger.error('AuthContext: Token refresh retry failed:', refreshError)
      }
    }

    // If we get here, auth failed - user needs to sign in again
    setRetryCount(0)
  }, [retryCount, loadUserProfile])

  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        logger.log('AuthContext: Initializing auth')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          await handleAuthError(error, 'INITIAL_SESSION_ERROR')
          return
        }

        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            const profileLoaded = await loadUserProfile(session.user.id)
            if (!profileLoaded) {
              logger.warn('AuthContext: Failed to load profile on init')
            }
          }
        }
      } catch (error) {
        logger.error('AuthContext: Init error:', error)
        await handleAuthError(error, 'INIT_EXCEPTION')
      } finally {
        if (mounted) {
          setLoading(false)
          setReady(true)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      logger.log('AuthContext: Auth state change:', event)

      if (event === 'SIGNED_OUT' || !session) {
        logger.log('AuthContext: User signed out or no session')
        setSession(null)
        setUser(null)
        setProfile(null)
        setUserRole('guest')
        setUserPermissions([])
        setRetryCount(0)
      } else if (event === 'TOKEN_REFRESH_FAILED') {
        await handleAuthError({ message: 'Token refresh failed' }, event)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        logger.log('AuthContext: User signed in or token refreshed')
        setSession(session)
        setUser(session?.user ?? null)
        setRetryCount(0)

        if (session?.user) {
          // Load profile with retry logic
          let attempts = 0
          const maxAttempts = 3

          while (attempts < maxAttempts) {
            const success = await loadUserProfile(session.user.id)
            if (success) break

            attempts++
            if (attempts < maxAttempts) {
              logger.log(`AuthContext: Profile load attempt ${attempts} failed, retrying...`)
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts)) // Exponential backoff
            }
          }

          if (attempts >= maxAttempts) {
            logger.error('AuthContext: Failed to load profile after all retries')
          }
        }
      }

      if (mounted) {
        setLoading(false)
        setReady(true)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadUserProfile, handleAuthError])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      logger.log('AuthContext: Manual profile refresh requested')
      await loadUserProfile(user.id)
    }
  }, [user?.id, loadUserProfile])

  const hasPermission = useCallback((permission: string) => {
    return userPermissions.includes(permission) || userRole === 'super_admin'
  }, [userPermissions, userRole])

  const isAdmin = useCallback(() => {
    return userRole === 'admin' || userRole === 'super_admin'
  }, [userRole])

  const isVendor = useCallback(() => {
    return userRole === 'vendor'
  }, [userRole])

  const signOut = useCallback(async () => {
    try {
      logger.log('AuthContext: Signing out user')
      const { error } = await supabase.auth.signOut()
      if (error) {
        logger.error('AuthContext: Sign out error:', error)
        return { error }
      }
      return { error: null }
    } catch (error) {
      logger.error('AuthContext: Sign out exception:', error)
      return { error: error as Error }
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      loading,
      ready,
      userPermissions,
      userRole,
      refreshProfile,
      hasPermission,
      isAdmin,
      isVendor,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
