import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

export function useAutoSync() {
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(false);
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Track if we were offline
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    // If we just came back online
    if (wasOffline.current && isOnline) {
      wasOffline.current = false;
      
      const sync = async () => {
        setIsSyncing(true);
        
        const toastId = toast.loading('Sincronizando dados...', {
          description: 'Atualizando informações do servidor',
        });

        try {
          // Invalidate and refetch all queries
          await queryClient.invalidateQueries();
          
          toast.success('Sincronizado!', {
            id: toastId,
            description: 'Dados atualizados com sucesso',
            duration: 3000,
          });
        } catch (error) {
          toast.error('Erro ao sincronizar', {
            id: toastId,
            description: 'Tente novamente mais tarde',
            duration: 4000,
          });
        } finally {
          setIsSyncing(false);
        }
      };

      // Small delay to ensure connection is stable
      const timer = setTimeout(sync, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queryClient]);

  return { isSyncing, isOnline };
}
