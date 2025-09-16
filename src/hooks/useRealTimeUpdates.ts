import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface UseRealTimeUpdatesProps {
  table: string;
  filter?: string;
  onUpdate?: (payload: any) => void;
  onInsert?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export const useRealTimeUpdates = ({
  table,
  filter,
  onUpdate,
  onInsert,
  onDelete
}: UseRealTimeUpdatesProps) => {
  const { profile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`realtime-${table}-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          setLastUpdate(new Date());
          
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          toast.error('Real-time connection error');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          toast.warning('Real-time connection timed out');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [table, filter, profile, onUpdate, onInsert, onDelete]);

  return {
    isConnected,
    lastUpdate
  };
};

export default useRealTimeUpdates;