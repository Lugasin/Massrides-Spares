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
  const { profile } = useAuth();

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
          reason: event.reason,
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
      const userAgent = navigator.userAgent;
      let ipAddress = 'unknown';
      
      // Get IP address (simplified)
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.warn('Could not fetch IP address:', error);
      }

      await supabase.from('activity_logs').insert({
        user_id: profile?.id,
        user_email: profile?.email,
        activity_type: event.action,
        resource_type: event.resource_type,
        resource_id: event.resource_id ? parseInt(event.resource_id) : null,
        additional_details: event.details || {},
        ip_address: ipAddress,
        user_agent: userAgent,
        log_source: 'client_audit'
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