-- Permitir check-in sem escala (schedule_id pode ser null)
ALTER TABLE public.check_ins ALTER COLUMN schedule_id DROP NOT NULL;

-- Adicionar campo para identificar o voluntário diretamente
ALTER TABLE public.check_ins ADD COLUMN volunteer_id uuid REFERENCES public.profiles(id);

-- Adicionar campo para vincular ao culto (quando sem escala)
ALTER TABLE public.check_ins ADD COLUMN service_id uuid REFERENCES public.services(id);

-- Flag para indicar check-in sem escala
ALTER TABLE public.check_ins ADD COLUMN is_unscheduled boolean NOT NULL DEFAULT false;

-- Atualizar RLS: usuários podem ver seus próprios check-ins pelo volunteer_id também
CREATE POLICY "Users can view their own check-ins by volunteer_id"
  ON public.check_ins FOR SELECT
  USING (volunteer_id = auth.uid());