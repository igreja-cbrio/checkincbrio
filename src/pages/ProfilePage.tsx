import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileStats, useUpdateProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  QrCode,
  Pencil,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function ProfilePage() {
  const { user, profile, isLeader, isAdmin, refreshProfile } = useAuth();
  const { data: stats, isLoading: loadingStats } = useProfileStats(user?.id);
  const updateProfile = useUpdateProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');

  const handleSave = async () => {
    if (!user?.id || !fullName.trim()) {
      toast.error('Nome não pode estar vazio');
      return;
    }

    try {
      await updateProfile.mutateAsync({ userId: user.id, fullName });
      await refreshProfile();
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil');
    }
  };

  const handleCancel = () => {
    setFullName(profile?.full_name || '');
    setIsEditing(false);
  };

  const getRoleBadge = () => {
    if (isAdmin) return <Badge variant="destructive">Admin</Badge>;
    if (isLeader) return <Badge variant="default">Líder</Badge>;
    return <Badge variant="secondary">Voluntário</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas informações</p>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações Pessoais
            </CardTitle>
            {getRoleBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  maxLength={100}
                />
                <Button 
                  size="icon" 
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={updateProfile.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm py-2">{profile?.full_name || '-'}</p>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setFullName(profile?.full_name || '');
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              </div>
            )}
          </div>

          {/* Email Field (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              Email
            </Label>
            <p className="text-sm text-muted-foreground py-2">{profile?.email || user?.email || '-'}</p>
          </div>

          {/* Planning Center ID (read-only) */}
          {profile?.planning_center_id && (
            <div className="space-y-2">
              <Label>Planning Center ID</Label>
              <p className="text-sm text-muted-foreground py-2 font-mono">
                {profile.planning_center_id}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Meu QR Code
          </CardTitle>
          <CardDescription>Use para fazer check-in rápido</CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.qr_code ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG 
                  value={profile.qr_code} 
                  size={120}
                  level="M"
                />
              </div>
              <Link to="/my-qrcode">
                <Button variant="outline" size="sm">
                  Ver em tela cheia
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              QR Code não disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Minhas Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center py-3">
                  <Skeleton className="h-8 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center py-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{stats?.totalCheckIns || 0}</p>
                <p className="text-xs text-muted-foreground">Total de Presenças</p>
              </div>
              
              <div className="text-center py-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats?.attendanceRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Presença</p>
              </div>
              
              <div className="text-center py-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-2xl font-bold">{stats?.scheduledCheckIns || 0}</p>
                </div>
                <p className="text-xs text-muted-foreground">Escalado</p>
              </div>
              
              <div className="text-center py-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-2xl font-bold">{stats?.unscheduledCheckIns || 0}</p>
                </div>
                <p className="text-xs text-muted-foreground">Sem Escala</p>
              </div>
            </div>
          )}

          {/* Current Month Highlight */}
          {!loadingStats && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Este mês</span>
                </div>
                <Badge variant="default">{stats?.currentMonthCheckIns || 0} presenças</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/history">
          <Card className="h-full active:scale-[0.98] transition-transform">
            <CardContent className="py-4 text-center">
              <Calendar className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Meu Histórico</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/schedules">
          <Card className="h-full active:scale-[0.98] transition-transform">
            <CardContent className="py-4 text-center">
              <Calendar className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Minhas Escalas</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
