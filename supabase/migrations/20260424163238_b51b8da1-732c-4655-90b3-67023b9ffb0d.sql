-- Mesclar services duplicados (mesmo service_type_name + scheduled_at)
-- Estratégia: para cada grupo, manter o service que tem MAIS schedules como canônico,
-- mover schedules e check_ins dos duplicados para ele, atualizar planning_center_id
-- para o do duplicado mais recente (caso seja maior), e deletar os duplicados.

DO $$
DECLARE
  grp RECORD;
  canonical_id UUID;
  canonical_pc_id TEXT;
  dup_id UUID;
  dup_pc_id TEXT;
BEGIN
  FOR grp IN
    SELECT service_type_name, scheduled_at, array_agg(id ORDER BY id) AS ids
    FROM public.services
    GROUP BY service_type_name, scheduled_at
    HAVING COUNT(*) > 1
  LOOP
    -- escolher canônico = service com mais schedules; em caso de empate, o mais recente
    SELECT s.id, s.planning_center_id
      INTO canonical_id, canonical_pc_id
    FROM public.services s
    LEFT JOIN public.schedules sch ON sch.service_id = s.id
    WHERE s.id = ANY(grp.ids)
    GROUP BY s.id, s.planning_center_id, s.created_at
    ORDER BY COUNT(sch.id) DESC, s.created_at DESC
    LIMIT 1;

    -- iterar pelos duplicados (todos exceto o canônico)
    FOR dup_id, dup_pc_id IN
      SELECT id, planning_center_id FROM public.services
      WHERE id = ANY(grp.ids) AND id <> canonical_id
    LOOP
      -- Mover check_ins do duplicado para o canônico
      -- Primeiro, check_ins ligados a schedules do duplicado: o schedule será movido,
      -- então só precisamos atualizar service_id nos check_ins que apontam diretamente
      UPDATE public.check_ins
      SET service_id = canonical_id
      WHERE service_id = dup_id;

      -- Mover schedules: para evitar conflito com unique (service_id, planning_center_person_id),
      -- deletar schedules do duplicado que já existem no canônico para a mesma pessoa
      DELETE FROM public.schedules d
      WHERE d.service_id = dup_id
        AND EXISTS (
          SELECT 1 FROM public.schedules c
          WHERE c.service_id = canonical_id
            AND c.planning_center_person_id = d.planning_center_person_id
        );

      -- Reapontar schedules restantes
      UPDATE public.schedules
      SET service_id = canonical_id
      WHERE service_id = dup_id;

      -- Deletar service duplicado
      DELETE FROM public.services WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- Adicionar unique constraint para impedir novas duplicatas
ALTER TABLE public.services
  ADD CONSTRAINT services_type_scheduled_unique UNIQUE (service_type_name, scheduled_at);