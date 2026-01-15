import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsers, useAddRole, useRemoveRole } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  // Only admins can access this page
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
      toast.success(`Role ${role} adicionada com sucesso!`);
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Usuário já possui essa role');
      } else {
        toast.error('Erro ao adicionar role');
      }
    }
  };

  const handleRemoveRole = async (userId: string, role: 'leader' | 'admin') => {
    try {
      await removeRoleMutation.mutateAsync({ userId, role });
      toast.success(`Role ${role} removida com sucesso!`);
    } catch (error) {
      toast.error('Erro ao remover role');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500 hover:bg-red-500"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'leader':
        return <Badge className="bg-blue-500 hover:bg-blue-500"><Shield className="h-3 w-3 mr-1" />Líder</Badge>;
      default:
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Voluntário</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-muted-foreground">Gerenciar usuários e permissões</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map(({ profile, roles: userRoles }) => {
                  const isLeader = userRoles.some(r => r.role === 'leader');
                  const isUserAdmin = userRoles.some(r => r.role === 'admin');

                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.full_name}</TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {userRoles.map(r => (
                            <span key={r.id}>{getRoleBadge(r.role)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {!isLeader ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddRole(profile.id, 'leader')}
                              disabled={addRoleMutation.isPending}
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
                            >
                              <Minus className="h-3 w-3 mr-1" />
                              Admin
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
