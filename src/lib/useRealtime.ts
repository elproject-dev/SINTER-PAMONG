import { useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook untuk subscribe ke perubahan realtime pada tabel Supabase.
 * Saat ada INSERT, UPDATE, atau DELETE pada tabel yang diawasi,
 * callback `onUpdate` akan dipanggil secara otomatis.
 * 
 * @param tables - Array nama tabel Supabase yang ingin diawasi
 * @param onUpdate - Callback yang dipanggil saat ada perubahan data
 */
export const useRealtimeSubscription = (
  tables: string[],
  onUpdate: () => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Buat nama channel unik berdasarkan tabel yang diawasi
    const channelName = `realtime-${tables.join('-')}-${Date.now()}`;

    let channel = supabase.channel(channelName);

    // Subscribe ke setiap tabel
    tables.forEach(table => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          onUpdate();
        }
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [tables.join(',')]); // Re-subscribe hanya jika daftar tabel berubah
};
