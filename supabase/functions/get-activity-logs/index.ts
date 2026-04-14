import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assertAdminOrSuperAdmin } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate and authorize user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

    try {
      await assertAdminOrSuperAdmin(authHeader, supabaseUrl, supabaseKey)
    } catch (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { searchParams } = new URL(req.url);
    let activityType = searchParams.get('activity_type');
    let userId = searchParams.get('user_id');
    let startDate = searchParams.get('start_date');
    let endDate = searchParams.get('end_date');

    // Fallback to JSON body if query params not provided
    if (!activityType && !userId && req.method !== 'GET') {
      try {
        const body = await req.json();
        activityType = body.activity_type ?? activityType;
        userId = body.user_id ?? userId;
        startDate = body.start_date ?? startDate;
        endDate = body.end_date ?? endDate;
      } catch {}
    }

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (activityType) {
      query = query.eq('action', activityType);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Database error:', error)
      throw new Error('Failed to fetch activity logs')
    }

    const uniqueUserIds = Array.from(new Set((logs || []).map((log: any) => log.user_id).filter(Boolean)));
    let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};

    if (uniqueUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .in('user_id', uniqueUserIds);

      if (profilesError) {
        console.error('Profiles fetch error:', profilesError)
        // Don't throw - continue without profile info
      } else {
        profileMap = Object.fromEntries(
          (profiles || []).map((profile: any) => [
            profile.user_id,
            {
              full_name: profile.full_name ?? null,
              email: profile.email ?? null,
            },
          ]),
        );
      }
    }

    const mappedLogs = (logs || []).map((log: any) => ({
      ...log,
      activity_type: log.action,
      additional_details: log.metadata || {},
      ip_address: log.metadata?.ip_address || null,
      user_profiles: log.user_id ? profileMap[log.user_id] ?? null : null,
    }));

    return new Response(
      JSON.stringify({ logs: mappedLogs }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Get activity logs error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
