-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    entity_type text,
    entity_id text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Index for querying logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins view all logs" ON activity_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Authenticated users can insert logs (e.g. "Logged In", "Viewed Page")
CREATE POLICY "Users can insert logs" ON activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- System/Service Role can do anything
GRANT ALL ON activity_logs TO service_role;
GRANT INSERT ON activity_logs TO authenticated;
