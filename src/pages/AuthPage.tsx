import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserCheck, Search, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { PlanningCenterSearch } from '@/components/auth/PlanningCenterSearch';
import { PlanningCenterPerson } from '@/hooks/usePlanningCenterSearch';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  planningCenterId: z.string().optional(),
});

export default function AuthPage() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlanningCenterSearch, setShowPlanningCenterSearch] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PlanningCenterPerson | null>(null);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPlanningCenterId, setSignupPlanningCenterId] = useState('');

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse({
      fullName: signupFullName,
      email: signupEmail,
      password: signupPassword,
      planningCenterId: signupPlanningCenterId,
    });
    
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(
      signupEmail,
      signupPassword,
      signupFullName,
      signupPlanningCenterId || undefined
    );
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } else {
      toast.success('Conta criada com sucesso!');
    }
  };

  const handleSelectPerson = (person: PlanningCenterPerson) => {
    setSelectedPerson(person);
    setSignupFullName(person.full_name);
    setSignupPlanningCenterId(person.id);
    setShowPlanningCenterSearch(false);
    toast.success(`Perfil "${person.full_name}" selecionado!`);
  };

  const handleClearSelection = () => {
    setSelectedPerson(null);
    setSignupFullName('');
    setSignupPlanningCenterId('');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8 bg-background safe-top safe-bottom">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Check-in</h1>
          <p className="text-sm text-muted-foreground">
            Sistema de check-in de voluntários
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                {showPlanningCenterSearch ? (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPlanningCenterSearch(false)}
                      className="mb-2 -ml-2"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Voltar
                    </Button>
                    <div>
                      <h3 className="font-medium mb-1">Buscar no Planning Center</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Digite seu nome para encontrar seu perfil
                      </p>
                      <PlanningCenterSearch onSelect={handleSelectPerson} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Planning Center Search Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12"
                      onClick={() => setShowPlanningCenterSearch(true)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Buscar meu perfil no Planning Center
                    </Button>

                    {/* Selected Person Indicator */}
                    {selectedPerson && (
                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{selectedPerson.full_name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearSelection}
                          className="h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
                        >
                          Limpar
                        </Button>
                      </div>
                    )}

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          ou preencha manualmente
                        </span>
                      </div>
                    </div>

                    {/* Signup Form */}
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Nome Completo</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          value={signupFullName}
                          onChange={(e) => setSignupFullName(e.target.value)}
                          autoComplete="name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Senha</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                      {!selectedPerson && (
                        <div className="space-y-2">
                          <Label htmlFor="signup-pco-id">ID Planning Center</Label>
                          <Input
                            id="signup-pco-id"
                            type="text"
                            placeholder="Opcional"
                            value={signupPlanningCenterId}
                            onChange={(e) => setSignupPlanningCenterId(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Para vincular às escalas
                          </p>
                        </div>
                      )}
                      <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Conta
                      </Button>
                    </form>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
