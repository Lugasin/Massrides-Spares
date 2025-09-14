import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SecurityQueryParams {
  timeframe?: '1h' | '24h' | '7d' | '30d';
  event_type?: string;
  risk_threshold?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const params: SecurityQueryParams = Object.fromEntries(url.searchParams)
    
    // Verify admin access
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Authorization required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Check if user is super admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Super admin access required')
    }

    const timeframe = params.timeframe || '24h'
    const hours = getHoursFromTimeframe(timeframe)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    // Get security metrics
    const securityMetrics = await getSecurityMetrics(supabase, since, params)
    
    // Get real-time alerts
    const alerts = await getSecurityAlerts(supabase, since, params.risk_threshold || 7)
    
    // Get payment metrics
    const paymentMetrics = await getPaymentMetrics(supabase, since)
    
    // Get system health
    const systemHealth = await getSystemHealth(supabase, since)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          timeframe,
          security_metrics: securityMetrics,
          alerts,
          payment_metrics: paymentMetrics,
          system_health: systemHealth,
          generated_at: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Security monitoring error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('access required') ? 403 : 400,
      }
    )
  }
})

async function getSecurityMetrics(supabase: any, since: string, params: SecurityQueryParams) {
  // Security events summary
  const { data: eventsSummary } = await supabase
    .from('tj_security_logs')
    .select('event_type, risk_score, blocked, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(params.limit || 1000)

  const events = eventsSummary || []
  
  // High-risk events
  const highRiskEvents = events.filter(e => e.risk_score >= (params.risk_threshold || 7))
  
  // Blocked events
  const blockedEvents = events.filter(e => e.blocked)
  
  // Event type breakdown
  const eventTypes = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1
    return acc
  }, {})

  // Risk score distribution
  const riskDistribution = events.reduce((acc, event) => {
    const range = getRiskRange(event.risk_score)
    acc[range] = (acc[range] || 0) + 1
    return acc
  }, {})

  return {
    total_events: events.length,
    high_risk_events: highRiskEvents.length,
    blocked_events: blockedEvents.length,
    event_types: eventTypes,
    risk_distribution: riskDistribution,
    latest_events: events.slice(0, 10)
  }
}

async function getSecurityAlerts(supabase: any, since: string, riskThreshold: number) {
  const { data: alerts } = await supabase
    .from('tj_security_logs')
    .select('*')
    .gte('created_at', since)
    .gte('risk_score', riskThreshold)
    .order('created_at', { ascending: false })
    .limit(50)

  return (alerts || []).map(alert => ({
    id: alert.id,
    event_type: alert.event_type,
    risk_score: alert.risk_score,
    blocked: alert.blocked,
    created_at: alert.created_at,
    metadata: alert.metadata,
    severity: getSeverity(alert.risk_score),
    description: getEventDescription(alert.event_type, alert.metadata)
  }))
}

async function getPaymentMetrics(supabase: any, since: string) {
  const { data: metrics } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('recorded_at', since)
    .like('metric_name', 'payment_%')
    .order('recorded_at', { ascending: false })

  const paymentMetrics = metrics || []
  
  // Aggregate metrics
  const aggregated = paymentMetrics.reduce((acc, metric) => {
    if (!acc[metric.metric_name]) {
      acc[metric.metric_name] = { total: 0, count: 0 }
    }
    acc[metric.metric_name].total += parseFloat(metric.metric_value)
    acc[metric.metric_name].count += 1
    return acc
  }, {})

  return {
    requests_total: aggregated.payment_requests_total?.total || 0,
    sessions_created: aggregated.payment_sessions_created?.total || 0,
    success_rate: aggregated.payment_sessions_created?.total / (aggregated.payment_requests_total?.total || 1) * 100,
    recent_activity: paymentMetrics.slice(0, 20)
  }
}

async function getSystemHealth(supabase: any, since: string) {
  // Get various system health metrics
  const { data: dbMetrics } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('recorded_at', since)
    .in('metric_name', ['db_connections', 'memory_usage', 'cpu_usage', 'response_time'])
    .order('recorded_at', { ascending: false })
    .limit(100)

  const metrics = dbMetrics || []
  
  // Calculate averages for key metrics
  const healthMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_name]) {
      acc[metric.metric_name] = { values: [], average: 0 }
    }
    acc[metric.metric_name].values.push(parseFloat(metric.metric_value))
    return acc
  }, {})

  // Calculate averages
  Object.keys(healthMetrics).forEach(key => {
    const values = healthMetrics[key].values
    healthMetrics[key].average = values.reduce((a, b) => a + b, 0) / values.length
  })

  // Overall health score (0-100)
  const healthScore = calculateHealthScore(healthMetrics)

  return {
    score: healthScore,
    status: getHealthStatus(healthScore),
    metrics: healthMetrics,
    uptime_percentage: 99.9, // This would come from actual monitoring
    last_incident: null // This would come from incident tracking
  }
}

function getHoursFromTimeframe(timeframe: string): number {
  switch (timeframe) {
    case '1h': return 1
    case '24h': return 24
    case '7d': return 24 * 7
    case '30d': return 24 * 30
    default: return 24
  }
}

function getRiskRange(score: number): string {
  if (score <= 2) return 'low'
  if (score <= 5) return 'medium'
  if (score <= 7) return 'high'
  return 'critical'
}

function getSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore <= 3) return 'low'
  if (riskScore <= 5) return 'medium'
  if (riskScore <= 7) return 'high'
  return 'critical'
}

function getEventDescription(eventType: string, metadata: any): string {
  const descriptions: Record<string, string> = {
    'payment_initiated': 'Payment process started',
    'payment_session_created': 'Payment session successfully created',
    'payment_session_failed': 'Failed to create payment session',
    'payment_auth_failed': 'Payment authentication failed',
    'payment_config_error': 'Payment configuration error',
    'payment_error': 'General payment error',
    'suspicious_activity': 'Suspicious activity detected',
    'multiple_failed_attempts': 'Multiple failed payment attempts',
    'high_risk_transaction': 'High-risk transaction flagged'
  }
  
  const baseDescription = descriptions[eventType] || 'Unknown security event'
  
  if (metadata?.amount) {
    return `${baseDescription} (Amount: $${metadata.amount})`
  }
  
  return baseDescription
}

function calculateHealthScore(metrics: any): number {
  // Simple health score calculation
  // In a real implementation, this would be more sophisticated
  let score = 100
  
  if (metrics.cpu_usage?.average > 80) score -= 20
  if (metrics.memory_usage?.average > 85) score -= 20
  if (metrics.response_time?.average > 2000) score -= 15
  
  return Math.max(0, score)
}

function getHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 80) return 'healthy'
  if (score >= 60) return 'warning'
  return 'critical'
}