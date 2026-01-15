import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsers, useAddRole, useRemoveRole } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, ShieldCheck, User, Search, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { roles } = useAuth();
  const isAdmin = roles.some(r => r.role === 'admin');
  const [searchTerm, setSearchTerm] = useState('');
  
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Gerenciar usuários</p>
      </div>

      <div className="relative">
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
  );
}
