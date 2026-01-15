import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export function QrCodeDisplay() {
  const { profile } = useAuth();

  if (!profile?.qr_code) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Seu QR Code ainda não foi gerado. Entre em contato com um líder.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">Meu QR Code</CardTitle>
        <CardDescription className="text-sm">
          Apresente este código ao líder
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4 pb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <QRCodeSVG 
            value={profile.qr_code} 
            size={220}
            level="H"
            includeMargin
          />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{profile.full_name}</p>
          {profile.planning_center_id && (
            <p className="text-xs text-muted-foreground mt-1">
              ID: {profile.planning_center_id}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
