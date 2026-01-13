import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MessageCircle, Send, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  conversation_id: string;
  created_at: string;
  read_at?: string;
  sender_profile?: {
    full_name: string;
    email: string;
  };
  recipient_profile?: {
    full_name: string;
    email: string;
  };
}

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string;
  other_participant?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  latest_message?: {
    content: string;
    sender_id: string;
  };
}

const Messages: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchConversations();
      subscribeToMessages();
    }
  }, [user, profile]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:user_profiles!conversations_participant_1_id_fkey(full_name, email, avatar_url),
          participant_2:user_profiles!conversations_participant_2_id_fkey(full_name, email, avatar_url)
        `)
        .or(`participant_1_id.eq.${profile?.id},participant_2_id.eq.${profile?.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const processedConversations = data?.map(conv => ({
        ...conv,
        other_participant: conv.participant_1_id === profile?.id
          ? conv.participant_2
          : conv.participant_1
      })) || [];

      setConversations(processedConversations);
      if (processedConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(processedConversations[0]);
      }
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:user_profiles!messages_sender_id_fkey(full_name, email),
          recipient_profile:user_profiles!messages_recipient_id_fkey(full_name, email)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', profile?.id)
        .is('read_at', null);

    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            setMessages(prev => [...prev, newMessage]);
          }
          fetchConversations(); // Refresh conversation list
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !selectedConversation || !profile) return;

    try {
      setSending(true);
      const recipientId = selectedConversation.participant_1_id === profile.id
        ? selectedConversation.participant_2_id
        : selectedConversation.participant_1_id;

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessageText.trim(),
          sender_id: profile.id,
          recipient_id: recipientId,
          conversation_id: selectedConversation.id
        });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      setNewMessageText('');

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout userRole="guest" userName="Guest">
        <div className="p-6 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground">Please sign in to access your messages.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Messages</h1>
              <p className="text-muted-foreground">Communicate with vendors and customers</p>
            </div>
          </div>
          <Button onClick={async () => {
            try {
              // Find a support user
              const { data: supportUsers, error: supportError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('role', 'support')
                .limit(1);

              if (supportError) throw supportError;

              const supportUser = supportUsers?.[0];
              if (!supportUser) {
                toast.error('No support agents available currently.');
                return;
              }

              // Check if conversation exists
              const { data: existingConvs, error: convError } = await supabase
                .from('conversations')
                .select('id')
                .or(`and(participant_1_id.eq.${profile?.id},participant_2_id.eq.${supportUser.id}),and(participant_1_id.eq.${supportUser.id},participant_2_id.eq.${profile?.id})`)
                .single();

              if (existingConvs) {
                // Select existing
                const conv = conversations.find(c => c.id === existingConvs.id);
                if (conv) setSelectedConversation(conv);
                else {
                  // Fetch if not in list (should be)
                  fetchConversations();
                }
              } else {
                // Create new
                const { data: newConv, error: createError } = await supabase
                  .from('conversations')
                  .insert({
                    participant_1_id: profile?.id,
                    participant_2_id: supportUser.id,
                    last_message_at: new Date().toISOString()
                  })
                  .select()
                  .single();

                if (createError) throw createError;
                toast.success('Started chat with support');
                fetchConversations();
              }

            } catch (err: any) {
              console.error('Error starting support chat:', err);
              toast.error('Failed to contact support');
            }
          }}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </div>

        <Card className="h-[calc(100vh-200px)]">
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Conversations ({conversations.length})
                </CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading conversations...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-muted/50 border-l-4 border-l-primary' : ''
                        }`}
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                          {conv.other_participant?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {conv.other_participant?.full_name || conv.other_participant?.email}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {conv.latest_message?.content || 'No messages yet'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Message Thread */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                        {selectedConversation.other_participant?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-medium">
                          {selectedConversation.other_participant?.full_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground font-normal">
                          {selectedConversation.other_participant?.email}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4" />
                          <p>No messages in this conversation yet.</p>
                          <p className="text-sm">Send a message to get started!</p>
                        </div>
                      ) : (
                        messages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender_id === profile?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                              }`}>
                              <div className="text-sm font-medium mb-1">
                                {msg.sender_id === profile?.id ? 'You' : msg.sender_profile?.full_name}
                              </div>
                              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                              <div className="text-xs mt-2 opacity-70 text-right">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                {msg.read_at && msg.sender_id === profile?.id && (
                                  <span className="ml-2">✓</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <div className="flex items-end gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        className="flex-1 resize-none min-h-[60px] max-h-32"
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessageText.trim() || sending}
                        className="px-4"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p>Choose a conversation from the sidebar to start messaging.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Messages;