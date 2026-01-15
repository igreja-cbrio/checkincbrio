import { QrCodeDisplay } from '@/components/volunteer/QrCodeDisplay';

export default function MyQrCodePage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Meu QR Code</h1>
        <p className="text-muted-foreground mt-1">
          Apresente este código ao líder para fazer check-in
        </p>
      </div>

      <QrCodeDisplay />
    </div>
  );
}
