
import React, { createContext, useContext, useEffect, useState } from 'react'
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
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [userRole, setUserRole] = useState<string>('guest')

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadUserProfile(session.user.id);
          } else {
            setReady(true);
          }
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        // ✅ ALWAYS Turn off loading
        if (mounted) setLoading(false);
      }
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Keep strict check for mounted component
      if (!mounted) return;

      const authEvent = event as string;

      // Handle Token Failures / Force Logout / Clean State efficiently
      if (authEvent === 'TOKEN_REFRESH_FAILED' || event === 'SIGNED_OUT' || !session) {
        logger.warn(`AuthContext: ${event} - Cleaning state.`);

        if (authEvent === 'SIGNED_OUT') {
          // Clean local storage only on explicit sign out
          localStorage.removeItem('supabase.auth.token');
        }

        setSession(null);
        setUser(null);
        setProfile(null);
        setUserRole('guest');
        setUserPermissions([]);
        // DO NOT FORCE RELOAD HERE - allow UI to react
      } else {
        // Valid Session
        setSession(session);
        setUser(session?.user ?? null);

        if (session.user) {
          // Upsert profile in background
          supabase.from('profiles').upsert({
            id: session.user.id,
            email: session.user.email,
            role: 'customer',
          }, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error("Profile Upsert Error:", error);
            // If success, load profile
            if (!error) loadUserProfile(session.user.id);
          });
        }
      }

      // ✅ ALWAYS Stop Loading
      setLoading(false);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data: rawData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        logger.error('Error loading user profile:', userError)
        return false;
      }

      if (rawData) {
        logger.log('AuthContext: User profile loaded.');
        setProfile(rawData)
        setUserRole((rawData as any).role || 'customer')
        return true
      }
    } catch (error) {
      logger.error('Error loading user profile:', error)
      return false
    }
    return false
  }

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  const hasPermission = (permission: string) => {
    return userPermissions.includes(permission) || userRole === 'super_admin'
  }

  const isAdmin = () => {
    return userRole === 'admin' || userRole === 'super_admin'
  }

  const isVendor = () => {
    return userRole === 'vendor'
  }

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
      isVendor
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}