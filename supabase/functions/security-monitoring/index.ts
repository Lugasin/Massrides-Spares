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

async function parseSecurityParams(req: Request): Promise<SecurityQueryParams> {
  const url = new URL(req.url)
  const queryParams = Object.fromEntries(url.searchParams.entries())
  let bodyParams: Record<string, unknown> = {}

  if (req.method !== 'GET') {
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        bodyParams = await req.json()
      } catch {
        bodyParams = {}
      }
    }
  }

  const merged = {
    ...queryParams,
    ...bodyParams,
  }

  return {
    timeframe: ['1h', '24h', '7d', '30d'].includes(String(merged.timeframe)) ? merged.timeframe as SecurityQueryParams['timeframe'] : '24h',
    event_type: merged.event_type ? String(merged.event_type) : undefined,
    risk_threshold: merged.risk_threshold !== undefined ? Number(merged.risk_threshold) : undefined,
    limit: merged.limit !== undefined ? Number(merged.limit) : undefined,
  }
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

    const params = await parseSecurityParams(req)
    
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
  const securityActions = [
    'suspicious_activity',
    'failed_login_attempt',
    'unauthorized_access',
    'data_breach_attempt',
    'payment_admin_action',
    'user_role_updated',
    'error_occurred',
  ]

  const { data: eventsSummary } = await supabase
    .from('activity_logs')
    .select('id, action, metadata, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(params.limit || 1000)

  const events = (eventsSummary || [])
    .filter((event: any) => securityActions.includes(event.action))
    .map((event: any) => ({
      event_type: event.action,
      risk_score: Number(event.metadata?.risk_score ?? 0),
      blocked: Boolean(event.metadata?.blocked),
      created_at: event.created_at,
    }))
  
  const highRiskEvents = events.filter(e => e.risk_score >= (params.risk_threshold || 7))
  const blockedEvents = events.filter(e => e.blocked)
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
    .from('activity_logs')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  return (alerts || [])
    .filter((alert: any) => Number(alert.metadata?.risk_score ?? 0) >= riskThreshold)
    .map((alert: any) => ({
    id: alert.id,
    event_type: alert.action,
    risk_score: Number(alert.metadata?.risk_score ?? 0),
    blocked: Boolean(alert.metadata?.blocked),
    created_at: alert.created_at,
    metadata: alert.metadata || {},
    severity: getSeverity(Number(alert.metadata?.risk_score ?? 0)),
    description: getEventDescription(alert.action, alert.metadata || {})
  }))
}

async function getPaymentMetrics(supabase: any, since: string) {
  const [{ data: paymentRows }, { data: auditRows }] = await Promise.all([
    supabase
      .from('payments')
      .select(`
        id,
        status,
        created_at,
        order:orders(
          order_number,
          total_amount,
          shipping_address
        )
      `)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    supabase
      .from('financial_audit_logs')
      .select('event_type, created_at, metadata')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
  ])

  const payments = paymentRows || []
  const audits = auditRows || []
  const requestsTotal = audits.filter((row: any) => row.event_type === 'payment_checkout_created').length
  const sessionsCreated = audits.filter((row: any) => row.event_type === 'payment_initialized').length
  const paidPayments = payments.filter((row: any) => row.status === 'paid').length
  const problematicPayments = payments
    .filter((row: any) => ['pending', 'authorised', 'failed', 'cancelled', 'refunded'].includes(row.status))
    .slice(0, 20)
    .map((row: any) => ({
      id: String(row.id),
      order_number: row.order?.order_number || `Order #${row.id}`,
      customer_email: String(row.order?.shipping_address?.email || ''),
      amount: Number(row.order?.total_amount || 0),
      status: row.status,
      created_at: row.created_at,
    }))

  return {
    requests_total: requestsTotal,
    sessions_created: sessionsCreated,
    success_rate: payments.length > 0 ? (paidPayments / payments.length) * 100 : 0,
    recent_activity: audits.slice(0, 20),
    problematic_payments: problematicPayments,
  }
}

async function getSystemHealth(supabase: any, since: string) {
  const { data: lowStockRows } = await supabase
    .from('inventory')
    .select(`
      id,
      quantity,
      threshold,
      product:products(
        id,
        name,
        vendor_id
      )
    `)
    .lte('quantity', 5)
    .order('quantity', { ascending: true })
    .limit(50)

  const vendorIds = Array.from(new Set((lowStockRows || []).map((row: any) => row.product?.vendor_id).filter(Boolean)))
  let vendorMap: Record<string, string> = {}

  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('user_profiles')
      .select('id, full_name, company_name')
      .in('id', vendorIds)

    vendorMap = Object.fromEntries(
      (vendors || []).map((vendor: any) => [vendor.id, vendor.company_name || vendor.full_name || 'Vendor']),
    )
  }

  const lowStockItems = (lowStockRows || []).map((row: any) => ({
    id: String(row.product?.id || row.id),
    name: row.product?.name || 'Unknown product',
    vendor_name: vendorMap[row.product?.vendor_id] || 'Vendor',
    stock_quantity: Number(row.quantity || 0),
    min_stock_level: Number(row.threshold || 0),
  }))

  const { data: recentErrors } = await supabase
    .from('activity_logs')
    .select('id')
    .eq('action', 'error_occurred')
    .gte('created_at', since)

  const { data: recentFailedPayments } = await supabase
    .from('payments')
    .select('id')
    .in('status', ['failed', 'cancelled'])
    .gte('created_at', since)

  const healthScore = Math.max(
    0,
    100 - (lowStockItems.length * 2) - ((recentErrors || []).length * 3) - ((recentFailedPayments || []).length * 2),
  )

  return {
    score: healthScore,
    status: getHealthStatus(healthScore),
    metrics: {
      low_stock_count: lowStockItems.length,
      recent_errors: (recentErrors || []).length,
      failed_payments: (recentFailedPayments || []).length,
    },
    uptime_percentage: 99.9, // This would come from actual monitoring
    last_incident: null,
    low_stock_items_count: lowStockItems.length,
    low_stock_items: lowStockItems,
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
    'payment_admin_action': 'Manual payment action recorded by an administrator',
    'user_role_updated': 'A user role was changed',
    'order_status_updated': 'An order status was changed',
    'error_occurred': 'Application error recorded',
    'suspicious_activity': 'Suspicious activity detected',
    'failed_login_attempt': 'Failed login attempt detected',
    'unauthorized_access': 'Unauthorized access attempt detected',
    'data_breach_attempt': 'Potential data breach attempt detected'
  }
  
  const baseDescription = descriptions[eventType] || 'Unknown security event'
  
  if (metadata?.amount) {
    return `${baseDescription} (Amount: ${metadata.amount})`
  }
  
  return baseDescription
}

function calculateHealthScore(metrics: any): number {
  return metrics?.score ?? 100
}

function getHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 80) return 'healthy'
  if (score >= 60) return 'warning'
  return 'critical'
}
