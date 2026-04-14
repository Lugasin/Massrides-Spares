import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface AuditEvent {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
}

export const ComprehensiveAuditLogger: React.FC = () => {
  const { profile, user } = useAuth();

  useEffect(() => {
    // Set up global error handler
    const handleError = (event: ErrorEvent) => {
      logAuditEvent({
        action: 'error_occurred',
        resource_type: 'application',
        details: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      });
    };

    // Set up unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logAuditEvent({
        action: 'unhandled_promise_rejection',
        resource_type: 'application',
        details: {
          reason: String(event.reason),
          stack: event.reason?.stack
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const logAuditEvent = async (event: AuditEvent) => {
    try {
      await supabase.from('activity_logs').insert({
        user_id: user?.id ?? null,
        action: event.action,
        metadata: {
          ...(event.details || {}),
          entity_type: event.resource_type,
          entity_id: event.resource_id ?? null,
          log_source: 'client_audit',
          user_agent: navigator.userAgent,
          profile_id: profile?.id ?? null,
          profile_email: profile?.email ?? null,
        }
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  };

  // Expose logging function globally
  useEffect(() => {
    (window as any).logAuditEvent = logAuditEvent;
  }, [profile]);

  return null; // This component doesn't render anything
};

export default ComprehensiveAuditLogger;
