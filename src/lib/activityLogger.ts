import { supabase } from '@/integrations/supabase/client';

interface LogActivityParams {
  actionType: string;
  actionDetails?: any;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  riskScore?: number;
}

export const logActivity = async ({ 
  actionType, 
  actionDetails = {}, 
  userId,
  resourceType,
  resourceId,
  riskScore = 0
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
        action: actionType,
        entity_type: resourceType || 'user_activity',
        entity_id: resourceId ? String(resourceId) : null,
        details: { 
          ...actionDetails, 
          risk_score: riskScore, 
          log_source: 'client_action',
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
};

// Specific logging functions with enhanced tracking
export const logAuthEvent = (event: 'login' | 'logout' | 'signup' | 'guest_login' | 'password_reset', userId?: string, details?: any) => {
  const riskScore = event === 'password_reset' ? 3 : event === 'guest_login' ? 1 : 0;
  logActivity({
    actionType: event,
    actionDetails: { ...details, timestamp: new Date().toISOString() },
    userId,
    resourceType: 'auth',
    resourceId: userId,
    riskScore
  });
};

export const logOrderEvent = (event: 'order_created' | 'order_updated' | 'order_cancelled' | 'order_shipped' | 'order_delivered', orderId: string, userId?: string, details?: any) => {
  const riskScore = event === 'order_cancelled' ? 2 : 0;
  logActivity({
    actionType: event,
    actionDetails: { order_id: orderId, ...details },
    userId,
    resourceType: 'order',
    resourceId: orderId,
    riskScore
  });
};

export const logPaymentEvent = (event: 'payment_processed' | 'payment_failed' | 'webhook_received' | 'payment_refunded', details: any, userId?: string) => {
  const riskScore = event === 'payment_failed' ? 3 : event === 'payment_refunded' ? 5 : 0;
  logActivity({
    actionType: event,
    actionDetails: details,
    userId,
    resourceType: 'payment',
    resourceId: details.transaction_id || details.order_id,
    riskScore
  });
};

export const logProfileEvent = (event: 'profile_updated' | 'profile_created' | 'role_changed', userId: string, details?: any) => {
  const riskScore = event === 'role_changed' ? 7 : 0;
  logActivity({
    actionType: event,
    actionDetails: details,
    userId,
    resourceType: 'profile',
    resourceId: userId,
    riskScore
  });
};

export const logProductEvent = (event: 'product_created' | 'product_updated' | 'product_deleted' | 'inventory_updated', productId: string, userId?: string, details?: any) => {
  const riskScore = event === 'product_deleted' ? 4 : 0;
  logActivity({
    actionType: event,
    actionDetails: { product_id: productId, ...details },
    userId,
    resourceType: 'product',
    resourceId: productId,
    riskScore
  });
};

export const logCartEvent = (event: 'cart_item_added' | 'cart_item_removed' | 'cart_cleared' | 'checkout_started', userId?: string, details?: any) => {
  logActivity({
    actionType: event,
    actionDetails: details,
    userId,
    resourceType: 'cart',
    resourceId: userId
  });
};

export const logSecurityEvent = (event: 'suspicious_activity' | 'failed_login_attempt' | 'unauthorized_access' | 'data_breach_attempt', details: any, userId?: string) => {
  const riskScore = event === 'data_breach_attempt' ? 10 : event === 'unauthorized_access' ? 8 : event === 'suspicious_activity' ? 6 : 4;
  logActivity({
    actionType: event,
    actionDetails: details,
    userId,
    resourceType: 'security',
    riskScore
  });
};

export const logSystemEvent = (event: 'system_startup' | 'system_shutdown' | 'backup_completed' | 'maintenance_started', details?: any) => {
  logActivity({
    actionType: event,
    actionDetails: details,
    resourceType: 'system',
    riskScore: 0
  });
};

// Enhanced error logging
export const logError = (error: Error, context?: string, userId?: string) => {
  logActivity({
    actionType: 'error_occurred',
    actionDetails: {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    },
    userId,
    resourceType: 'error',
    riskScore: 2
  });
};

// Performance logging
export const logPerformance = (metric: string, value: number, unit: string = 'ms', userId?: string) => {
  logActivity({
    actionType: 'performance_metric',
    actionDetails: {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString()
    },
    userId,
    resourceType: 'performance'
  });
};