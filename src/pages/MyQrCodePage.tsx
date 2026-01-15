import { QrCodeDisplay } from '@/components/volunteer/QrCodeDisplay';

export default function MyQrCodePage() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Meu QR Code</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mostre para fazer check-in
        </p>
      </div>

      <QrCodeDisplay />
    </div>
  );
}
