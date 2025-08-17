-- Create user_settings table for Settings page
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  marketing_emails boolean NOT NULL DEFAULT false,
  order_updates boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language text NOT NULL DEFAULT 'en',
  currency text NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'Africa/Lusaka',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL USING (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time for user_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;

-- Create index for performance
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- Fix messaging system tables if they don't exist properly
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  participant_2_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participant_1_id, participant_2_id),
  CHECK (participant_1_id != participant_2_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on conversations and messages
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    participant_1_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    participant_2_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- RLS policies for messages
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (
    sender_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    recipient_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their messages" ON public.messages
  FOR UPDATE USING (
    sender_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    recipient_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- Enable real-time for messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create indexes for messaging performance
CREATE INDEX idx_conversations_participants ON public.conversations(participant_1_id, participant_2_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, created_at DESC);

-- Function to create or get conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user1_id uuid, p_user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id uuid;
  ordered_user1_id uuid;
  ordered_user2_id uuid;
BEGIN
  -- Order user IDs to ensure consistent conversation creation
  IF p_user1_id < p_user2_id THEN
    ordered_user1_id := p_user1_id;
    ordered_user2_id := p_user2_id;
  ELSE
    ordered_user1_id := p_user2_id;
    ordered_user2_id := p_user1_id;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conversation_id
  FROM public.conversations
  WHERE participant_1_id = ordered_user1_id AND participant_2_id = ordered_user2_id;

  -- If not found, create new conversation
  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (participant_1_id, participant_2_id)
    VALUES (ordered_user1_id, ordered_user2_id)
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$;

-- Force PostgREST schema reload
SELECT pg_notify('pgrst', 'reload schema');