import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export function QrCodeDisplay() {
  const { profile } = useAuth();

  if (!profile?.qr_code) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Seu QR Code ainda não foi gerado. Entre em contato com um líder.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-sm mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Meu QR Code</CardTitle>
        <CardDescription>
          Apresente este código ao líder para fazer check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG 
            value={profile.qr_code} 
            size={200}
            level="H"
            includeMargin
          />
        </div>
        <p className="text-lg font-semibold">{profile.full_name}</p>
      </CardContent>
    </Card>
  );
}
