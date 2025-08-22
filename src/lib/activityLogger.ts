import { supabase } from '@/integrations/supabase/client';

interface LogActivityParams {
  actionType: string;
  actionDetails?: any;
  userId?: string;
}

export const logActivity = async ({ 
  actionType, 
  actionDetails = {}, 
  userId 
}: LogActivityParams) => {
  try {
    // Get client info
    const userAgent = navigator.userAgent;
    
    // Get IP address (simplified - in production you'd use a service)
    let ipAddress = 'unknown';
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      ipAddress = data.ip;
    } catch (error) {
      console.warn('Could not fetch IP address:', error);
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        activity_type: actionType,
        resource_type: 'user_activity',
        resource_id: parseInt(userId) || null,
        additional_details: actionDetails || {},
        ip_address: ipAddress,
        user_agent: userAgent,
        log_source: 'client_action'
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
};

// Specific logging functions
export const logAuthEvent = (event: 'login' | 'logout' | 'signup' | 'guest_login', userId?: string, details?: any) => {
  logActivity({
    actionType: event,
    actionDetails: { ...details, timestamp: new Date().toISOString() },
    userId
  });
};

export const logOrderEvent = (event: 'order_created' | 'order_updated' | 'order_cancelled', orderId: string, userId?: string, details?: any) => {
  logActivity({
    actionType: event,
    actionDetails: { order_id: orderId, ...details },
    userId
  });
};

export const logPaymentEvent = (event: 'payment_processed' | 'payment_failed' | 'webhook_received', details: any, userId?: string) => {
  logActivity({
    actionType: event,
    actionDetails: details,
    userId
  });
};

export const logProfileEvent = (event: 'profile_updated' | 'profile_created', userId: string, details?: any) => {
  logActivity({
    actionType: event,
    actionDetails: details,
    userId
  });
};