import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { useVolunteersQrCodes, VolunteerWithQrCode } from '@/hooks/useVolunteersQrCodes';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';
import { Search, Eye, History, QrCode, UserPlus, Scan } from 'lucide-react';
import { QrCodeModal } from '@/components/qrcodes/QrCodeModal';
import { QrCodePdfExport } from '@/components/qrcodes/QrCodePdfExport';
import { PlanningCenterQrSearch } from '@/components/qrcodes/PlanningCenterQrSearch';
import { FaceEnrollmentDialog } from '@/components/face/FaceEnrollmentDialog';

export default function QrCodeManagementPage() {
  const { isLeader } = useAuth();
  const { data: volunteers, isLoading } = useVolunteersQrCodes();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerWithQrCode | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [faceEnrollmentOpen, setFaceEnrollmentOpen] = useState(false);
  const [faceEnrollmentVolunteer, setFaceEnrollmentVolunteer] = useState<VolunteerWithQrCode | null>(null);

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredVolunteers = volunteers?.filter(v =>
    v.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.planning_center_id?.includes(searchTerm)
  ) || [];

  const handleViewQrCode = (volunteer: VolunteerWithQrCode) => {
    setSelectedVolunteer(volunteer);
    setModalOpen(true);
  };

  const handleVolunteerCreated = (volunteer: VolunteerWithQrCode) => {
    // Open the QR code modal for the newly created volunteer
    setSelectedVolunteer(volunteer);
    setModalOpen(true);
  };

  const handleEnrollFace = (volunteer: VolunteerWithQrCode) => {
    setFaceEnrollmentVolunteer(volunteer);
    setFaceEnrollmentOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Gestão de QR Codes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voluntários ativos nos últimos 3 meses
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <PlanningCenterQrSearch onVolunteerCreated={handleVolunteerCreated} />
          {volunteers && volunteers.length > 0 && (
            <QrCodePdfExport volunteers={filteredVolunteers} />
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum voluntário encontrado' : 'Nenhum voluntário cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredVolunteers.map((volunteer) => {
            const qrValue = volunteer.qr_code || volunteer.planning_center_id || volunteer.id;
            const hasQrCode = !!(volunteer.qr_code || volunteer.planning_center_id);

            return (
              <Card key={volunteer.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* QR Code Thumbnail */}
                    <div className="shrink-0 bg-white p-2 rounded-lg border">
                      <QRCodeSVG
                        value={qrValue}
                        size={60}
                        level="L"
                      />
                    </div>

                    {/* Volunteer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{volunteer.full_name}</p>
                    {volunteer.source === 'profile' ? (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                            Com Conta
                          </Badge>
                        ) : hasQrCode ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            QR Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            Sem QR
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{volunteer.email}</p>
                      {volunteer.planning_center_id && (
                        <p className="text-xs text-muted-foreground">
                          PC ID: {volunteer.planning_center_id}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEnrollFace(volunteer)}
                        title="Cadastrar Rosto"
                      >
                        <Scan className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewQrCode(volunteer)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Ver QR</span>
                      </Button>
                      <Link to={`/history/${volunteer.id}`}>
                        <Button variant="ghost" size="sm">
                          <History className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        {filteredVolunteers.length} voluntário(s) encontrado(s)
      </p>

      <QrCodeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        volunteer={selectedVolunteer}
      />

      <FaceEnrollmentDialog
        open={faceEnrollmentOpen}
        onOpenChange={setFaceEnrollmentOpen}
        volunteer={faceEnrollmentVolunteer ? {
          id: faceEnrollmentVolunteer.id,
          full_name: faceEnrollmentVolunteer.full_name,
          planning_center_id: faceEnrollmentVolunteer.planning_center_id,
          source: faceEnrollmentVolunteer.source,
          avatar_url: faceEnrollmentVolunteer.avatar_url,
        } : null}
      />
    </div>
  );
}
