import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PlanningCenterCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const savedState = sessionStorage.getItem('pc_oauth_state');
      const returnedState = searchParams.get('state');

      // Clear saved state
      sessionStorage.removeItem('pc_oauth_state');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        setErrorMessage('Autorização negada pelo Planning Center');
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        setStatus('error');
        setErrorMessage('Código de autorização não recebido');
        return;
      }

      // Verify state to prevent CSRF
      if (savedState && returnedState && savedState !== returnedState) {
        console.error('State mismatch - possible CSRF attack');
        setStatus('error');
        setErrorMessage('Erro de segurança. Por favor, tente novamente.');
        return;
      }

      try {
        // Call the callback edge function
        const redirectUri = `${window.location.origin}/planning-center/callback`;
        
        const { data, error: fnError } = await supabase.functions.invoke('planning-center-callback', {
          body: { code, redirectUri },
        });

        if (fnError) {
          console.error('Callback error:', fnError);
          throw new Error(fnError.message || 'Erro ao processar autenticação');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Erro ao processar autenticação');
        }

        // Use the tokenHash to verify and create session
        if (data.tokenHash && data.email) {
          console.log('Verifying OTP with token hash...');
          
          const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: data.tokenHash,
            type: 'email',
          });

          if (verifyError) {
            console.error('Verification error:', verifyError);
            throw new Error('Falha ao verificar token de autenticação');
          }

          // Verify session was established
          if (!sessionData.session) {
            console.error('No session returned from verifyOtp');
            throw new Error('Sessão não foi criada');
          }

          console.log('Session established successfully');
        } else {
          throw new Error('Token de autenticação não recebido');
        }

        setStatus('success');
        toast.success(data.isNewUser ? 'Conta criada com sucesso!' : 'Login realizado!');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } catch (err: any) {
        console.error('Error processing callback:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Erro ao processar autenticação');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8 bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h2 className="text-lg font-semibold">Processando login...</h2>
                <p className="text-sm text-muted-foreground">
                  Aguarde enquanto verificamos sua conta no Planning Center
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <h2 className="text-lg font-semibold">Login realizado!</h2>
                <p className="text-sm text-muted-foreground">
                  Redirecionando para o dashboard...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-lg font-semibold">Erro na autenticação</h2>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
                <Button onClick={() => navigate('/auth')} className="mt-4">
                  Voltar para login
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
