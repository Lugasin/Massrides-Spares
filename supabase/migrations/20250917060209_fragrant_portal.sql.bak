/*
  # Communication and Notification System

  1. New Tables
    - `notifications` - User notifications with action URLs
    - `messages` - User-to-user messaging system
    - `conversations` - Message thread management
    - `guest_verifications` - Email verification for guest checkout

  2. Security
    - Enable RLS on all communication tables
    - Add policies for user privacy and admin access
    - Ensure message privacy between participants

  3. Features
    - Real-time notification system
    - User messaging with conversation threading
    - Guest email verification for checkout
*/

-- =====================================================
-- COMMUNICATION TABLES CREATION
-- =====================================================

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'welcome', 'order', 'payment', 'message')),
    action_url text,
    read_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    participant_2_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    last_message_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    UNIQUE(participant_1_id, participant_2_id),
    CHECK (participant_1_id != participant_2_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    recipient_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    attachment_url text,
    read_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Guest Verifications Table
CREATE TABLE IF NOT EXISTS public.guest_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    verification_code text NOT NULL,
    session_id text NOT NULL,
    expires_at timestamptz NOT NULL,
    verified_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES FOR COMMUNICATION SYSTEM
-- =====================================================

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Conversations Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON public.conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON public.conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at);

-- Messages Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Guest Verifications Indexes
CREATE INDEX IF NOT EXISTS idx_guest_verifications_email ON public.guest_verifications(email);
CREATE INDEX IF NOT EXISTS idx_guest_verifications_session_id ON public.guest_verifications(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_verifications_expires_at ON public.guest_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_verifications_verified_at ON public.guest_verifications(verified_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_verifications ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Conversations Policies
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
CREATE POLICY "Users can read own conversations"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (
        participant_1_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        ) OR
        participant_2_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        participant_1_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        ) OR
        participant_2_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Messages Policies
DROP POLICY IF EXISTS "Users can read conversation messages" ON public.messages;
CREATE POLICY "Users can read conversation messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        conversation_id IN (
            SELECT c.id FROM public.conversations c
            WHERE c.participant_1_id IN (
                SELECT id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            ) OR c.participant_2_id IN (
                SELECT id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        recipient_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Guest Verifications Policies (no RLS needed for guest operations)
DROP POLICY IF EXISTS "Anyone can manage guest verifications" ON public.guest_verifications;
CREATE POLICY "Anyone can manage guest verifications"
    ON public.guest_verifications FOR ALL
    TO anon, authenticated
    USING (true);

-- =====================================================
-- TRIGGERS FOR COMMUNICATION AUTOMATION
-- =====================================================

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_last_message();

-- Function to clean up expired guest verifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_guest_verifications()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.guest_verifications
    WHERE expires_at < now() AND verified_at IS NULL;
END;
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.notifications IS 'User notifications with support for action URLs and read status';
COMMENT ON TABLE public.conversations IS 'Message conversations between users';
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON TABLE public.guest_verifications IS 'Email verification codes for guest checkout';

COMMENT ON FUNCTION public.update_conversation_last_message() IS 'Updates conversation timestamp when new message is sent';
COMMENT ON FUNCTION public.cleanup_expired_guest_verifications() IS 'Removes expired guest verification codes';