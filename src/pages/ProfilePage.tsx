import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileStats, useUpdateProfile } from '@/hooks/useProfile';
import { useLinkPlanningCenter, useSyncFromPlanningCenter } from '@/hooks/usePlanningCenterSearch';
import { PlanningCenterSearch } from '@/components/auth/PlanningCenterSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Loader2,
  RefreshCw,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { PlanningCenterPerson } from '@/hooks/usePlanningCenterSearch';

export default function ProfilePage() {
  const { user, profile, isLeader, isAdmin, refreshProfile } = useAuth();
  const { data: stats, isLoading: loadingStats } = useProfileStats(user?.id);
  const updateProfile = useUpdateProfile();
  const linkPlanningCenter = useLinkPlanningCenter();
  const syncFromPlanningCenter = useSyncFromPlanningCenter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [showPlanningCenterSearch, setShowPlanningCenterSearch] = useState(false);

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

  const handleSelectPerson = async (person: PlanningCenterPerson) => {
    if (!user?.id) return;

    try {
      await linkPlanningCenter.mutateAsync({
        userId: user.id,
        planningCenterId: person.id,
        fullName: person.full_name,
        avatarUrl: person.avatar_url,
      });
      await refreshProfile();
      setShowPlanningCenterSearch(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleSyncFromPlanningCenter = async () => {
    if (!user?.id || !profile?.planning_center_id) return;

    try {
      await syncFromPlanningCenter.mutateAsync({
        userId: user.id,
        planningCenterId: profile.planning_center_id,
      });
      await refreshProfile();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getRoleBadge = () => {
    if (isAdmin) return <Badge variant="destructive">Admin</Badge>;
    if (isLeader) return <Badge variant="default">Líder</Badge>;
    return <Badge variant="secondary">Voluntário</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Access avatar_url from profile (may not be in types yet but exists in DB)
  const avatarUrl = (profile as any)?.avatar_url;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl} alt={profile?.full_name} />
          <AvatarFallback className="text-lg">
            {profile?.full_name ? getInitials(profile.full_name) : <User className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações</p>
        </div>
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
        </CardContent>
      </Card>

      {/* Planning Center Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Planning Center
          </CardTitle>
          <CardDescription>
            Vincule ao Planning Center para sincronizar suas informações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showPlanningCenterSearch ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Buscar seu perfil</p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPlanningCenterSearch(false)}
                >
                  Cancelar
                </Button>
              </div>
              <PlanningCenterSearch onSelect={handleSelectPerson} />
            </div>
          ) : profile?.planning_center_id ? (
            <div className="space-y-4">
              {/* Linked status */}
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Vinculado</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {profile.planning_center_id}
                  </p>
                </div>
              </div>

              {/* Sync button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSyncFromPlanningCenter}
                disabled={syncFromPlanningCenter.isPending}
              >
                {syncFromPlanningCenter.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar do Planning Center
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Sincroniza nome e foto do seu perfil no Planning Center
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Not linked status */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Não vinculado</p>
                  <p className="text-xs text-muted-foreground">
                    Vincule para sincronizar suas informações
                  </p>
                </div>
              </div>

              {/* Link button */}
              <Button
                variant="default"
                className="w-full"
                onClick={() => setShowPlanningCenterSearch(true)}
                disabled={linkPlanningCenter.isPending}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Vincular ao Planning Center
              </Button>
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
