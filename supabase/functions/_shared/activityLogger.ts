import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface LogActivityParams {
  actionType: string;
  actionDetails?: any;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const logActivity = async ({ 
  actionType, 
  actionDetails = {}, 
  userId,
  ipAddress,
  userAgent
}: LogActivityParams) => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails,
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