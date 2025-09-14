import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Shield, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';

interface SecurityAlert {
  id: string;
  event_type: string;
  risk_score: number;
  blocked: boolean;
  created_at: string;
  metadata: any;
}

const SecurityAlertToast = () => {
  const { userRole } = useAuth();

  useEffect(() => {
    if (userRole !== 'super_admin') return;

    const channel = supabase
      .channel('security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tj_security_logs'
        },
        (payload) => {
          const alert = payload.new as SecurityAlert;
          
          // Only show high-risk alerts as toast notifications
          if (alert.risk_score >= 7) {
            showSecurityToast(alert);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  const showSecurityToast = (alert: SecurityAlert) => {
    const severity = getSeverity(alert.risk_score);
    const icon = getIcon(severity, alert.blocked);
    
    const toastOptions = {
      duration: severity === 'critical' ? 10000 : 5000,
      action: {
        label: 'View Details',
        onClick: () => {
          // Navigate to security dashboard
          window.location.href = '/security-dashboard';
        },
      },
    };

    const message = `${alert.event_type.replace(/_/g, ' ')} - Risk: ${alert.risk_score}/10`;

    if (severity === 'critical') {
      toast.error(message, {
        ...toastOptions,
        icon,
        description: alert.blocked ? 'Threat blocked automatically' : 'Manual review required',
      });
    } else {
      toast.warning(message, {
        ...toastOptions,
        icon,
        description: `${alert.blocked ? 'Blocked' : 'Allowed'} - ${new Date(alert.created_at).toLocaleTimeString()}`,
      });
    }
  };

  const getSeverity = (riskScore: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (riskScore >= 9) return 'critical';
    if (riskScore >= 7) return 'high';
    if (riskScore >= 5) return 'medium';
    return 'low';
  };

  const getIcon = (severity: string, blocked: boolean) => {
    if (blocked) return <Shield className="h-4 w-4" />;
    
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  return null; // This component doesn't render anything visible
};

export default SecurityAlertToast;