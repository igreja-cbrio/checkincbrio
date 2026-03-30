import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsers, useAddRole, useRemoveRole } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, ShieldCheck, User, Search, Plus, Minus, History, Calendar } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AdminPage() {
  const { roles } = useAuth();
  const isAdmin = roles.some(r => r.role === 'admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-10-31');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ services: number; schedules: number; qrCodesGenerated: number } | null>(null);
  
  const { data: users, isLoading } = useAllUsers();
  const addRoleMutation = useAddRole();
  const removeRoleMutation = useRemoveRole();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredUsers = users?.filter(u =>
    u.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRole = async (userId: string, role: 'leader' | 'admin') => {
    try {
      await addRoleMutation.mutateAsync({ userId, role });
      toast.success(`${role} adicionado!`);
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Já possui essa role');
      } else {
        toast.error('Erro ao adicionar');
      }
    }
  };

  const handleRemoveRole = async (userId: string, role: 'leader' | 'admin') => {
    try {
      await removeRoleMutation.mutateAsync({ userId, role });
      toast.success(`${role} removido!`);
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const handleHistoricalSync = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecione as datas de início e fim');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-planning-center-historical', {
        method: 'POST',
        body: { startDate, endDate },
      });

      if (error) throw new Error(error.message || 'Erro na sincronização');
      if (data?.error) throw new Error(data.error);

      setSyncResult(data);
      toast.success(`Sincronização concluída! ${data.services} cultos, ${data.schedules} escalas importadas.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar dados históricos');
    } finally {
      setIsSyncing(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500 hover:bg-red-500 text-xs"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'leader':
        return <Badge className="bg-blue-500 hover:bg-blue-500 text-xs"><Shield className="h-3 w-3 mr-1" />Líder</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs"><User className="h-3 w-3 mr-1" />Vol.</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Gerenciar usuários e dados</p>
      </div>

      {/* Historical Sync Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Sincronização Histórica
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Importar dados do Planning Center de um período específico
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Início
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSyncing}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Fim
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSyncing}
              />
            </div>
          </div>

          <Button
            onClick={handleHistoricalSync}
            disabled={isSyncing}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sincronizando... (pode levar alguns minutos)
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                Sincronizar Período
              </>
            )}
          </Button>

          {syncResult && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">✅ Sincronização concluída!</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Cultos importados: <span className="font-medium text-foreground">{syncResult.services}</span></p>
                <p>Escalas importadas: <span className="font-medium text-foreground">{syncResult.schedules}</span></p>
                <p>QR Codes gerados: <span className="font-medium text-foreground">{syncResult.qrCodesGenerated}</span></p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Gerenciar Usuários</h2>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers?.map(({ profile, roles: userRoles }) => {
              const isLeader = userRoles.some(r => r.role === 'leader');
              const isUserAdmin = userRoles.some(r => r.role === 'admin');

              return (
                <Card key={profile.id}>
                  <CardContent className="py-3">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                        </div>
                        <div className="flex gap-1 flex-wrap shrink-0">
                          {userRoles.map(r => (
                            <span key={r.id}>{getRoleBadge(r.role)}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!isLeader ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddRole(profile.id, 'leader')}
                            disabled={addRoleMutation.isPending}
                            className="flex-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Líder
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveRole(profile.id, 'leader')}
                            disabled={removeRoleMutation.isPending}
                            className="flex-1"
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            Líder
                          </Button>
                        )}
                        {!isUserAdmin ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddRole(profile.id, 'admin')}
                            disabled={addRoleMutation.isPending}
                            className="flex-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Admin
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveRole(profile.id, 'admin')}
                            disabled={removeRoleMutation.isPending}
                            className="flex-1"
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            Admin
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
