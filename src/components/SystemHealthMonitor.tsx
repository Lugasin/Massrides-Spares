import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Database, 
  Wifi, 
  Shield, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemHealth {
  database: 'healthy' | 'warning' | 'critical';
  realtime: 'connected' | 'disconnected' | 'reconnecting';
  payments: 'operational' | 'degraded' | 'down';
  storage: 'healthy' | 'warning' | 'critical';
  functions: 'healthy' | 'warning' | 'critical';
  overall: number; // 0-100
}

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  lastUpdated: string;
}

export const SystemHealthMonitor: React.FC = () => {
  const { userRole } = useAuth();
  const [health, setHealth] = useState<SystemHealth>({
    database: 'healthy',
    realtime: 'connected',
    payments: 'operational',
    storage: 'healthy',
    functions: 'healthy',
    overall: 100
  });
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      checkSystemHealth();
      const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const checkSystemHealth = async () => {
    try {
      setLoading(true);

      // Test database connectivity
      const dbStart = Date.now();
      const { error: dbError } = await supabase.from('user_profiles').select('id').limit(1);
      const dbLatency = Date.now() - dbStart;

      // Test realtime connectivity
      const realtimeStatus = supabase.realtime.isConnected() ? 'connected' : 'disconnected';

      // Test edge functions
      const funcStart = Date.now();
      const { error: funcError } = await supabase.functions.invoke('real-time-notifications', {
        body: { test: true }
      });
      const funcLatency = Date.now() - funcStart;

      // Calculate overall health
      let overallHealth = 100;
      if (dbError) overallHealth -= 30;
      if (realtimeStatus !== 'connected') overallHealth -= 20;
      if (funcError) overallHealth -= 20;
      if (dbLatency > 1000) overallHealth -= 15;
      if (funcLatency > 5000) overallHealth -= 15;

      setHealth({
        database: dbError ? 'critical' : dbLatency > 500 ? 'warning' : 'healthy',
        realtime: realtimeStatus,
        payments: 'operational', // This would check TJ connectivity
        storage: 'healthy', // This would check Supabase Storage
        functions: funcError ? 'critical' : funcLatency > 3000 ? 'warning' : 'healthy',
        overall: Math.max(0, overallHealth)
      });

      // Update metrics
      setMetrics([
        {
          name: 'Database Latency',
          value: dbLatency,
          unit: 'ms',
          status: dbLatency > 500 ? 'warning' : 'good',
          lastUpdated: new Date().toISOString()
        },
        {
          name: 'Function Latency',
          value: funcLatency,
          unit: 'ms',
          status: funcLatency > 3000 ? 'warning' : 'good',
          lastUpdated: new Date().toISOString()
        },
        {
          name: 'Overall Health',
          value: overallHealth,
          unit: '%',
          status: overallHealth < 80 ? 'critical' : overallHealth < 95 ? 'warning' : 'good',
          lastUpdated: new Date().toISOString()
        }
      ]);

      // Record health metrics
      await supabase.rpc('record_metric', {
        p_metric_name: 'system_health_score',
        p_metric_value: overallHealth,
        p_metric_unit: 'percentage'
      });

      await supabase.rpc('record_metric', {
        p_metric_name: 'database_latency',
        p_metric_value: dbLatency,
        p_metric_unit: 'milliseconds'
      });

    } catch (error: any) {
      console.error('Error checking system health:', error);
      setHealth(prev => ({ ...prev, overall: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'degraded':
      case 'reconnecting':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
      case 'disconnected':
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
      case 'good':
        return 'default';
      case 'warning':
      case 'degraded':
      case 'reconnecting':
        return 'secondary';
      case 'critical':
      case 'disconnected':
      case 'down':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Monitor
            </CardTitle>
            <Button variant="outline" size="sm" onClick={checkSystemHealth} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold mb-2 ${
              health.overall >= 95 ? 'text-green-500' : 
              health.overall >= 80 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {health.overall}%
            </div>
            <p className="text-muted-foreground">Overall System Health</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getStatusIcon(health.database)}
                <span className="font-medium">Database</span>
              </div>
              <Badge variant={getStatusColor(health.database)} className="capitalize">
                {health.database}
              </Badge>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getStatusIcon(health.realtime)}
                <span className="font-medium">Real-time</span>
              </div>
              <Badge variant={getStatusColor(health.realtime)} className="capitalize">
                {health.realtime}
              </Badge>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getStatusIcon(health.payments)}
                <span className="font-medium">Payments</span>
              </div>
              <Badge variant={getStatusColor(health.payments)} className="capitalize">
                {health.payments}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric) => (
              <div key={metric.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(metric.status)}
                  <div>
                    <p className="font-medium">{metric.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(metric.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {metric.value.toFixed(metric.unit === 'ms' ? 0 : 1)} {metric.unit}
                  </p>
                  <Badge variant={getStatusColor(metric.status)} className="capitalize">
                    {metric.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealthMonitor;