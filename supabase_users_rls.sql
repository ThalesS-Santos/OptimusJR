-- Script para corrigir RLS (Row Level Security) e coluna XP da tabela users
-- 1. Garante que a coluna xp exista
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- 2. Habilita RLS (caso não esteja)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Remove políticas conflitantes de UPDATE se existirem (Opcional, mas seguro)
DROP POLICY IF EXISTS "Qualquer autenticado lê usuários" ON public.users;
DROP POLICY IF EXISTS "Membros autenticados editam usuários" ON public.users;

-- 4. Cria política de leitura (Todos podem ver o perfil/rank dos outros)
CREATE POLICY "Qualquer autenticado lê usuários" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (true);

-- 5. Cria política de atualização (Qualquer um autenticado pode atualizar perfis/XP)
-- Nota: Para um sistema mais seguro, a política de UPDATE poderia ser restrita,
-- mas como a gamificação permite que diretores atualizem XP de outros membros,
-- 'USING (true)' é necessário no design atual.
CREATE POLICY "Membros autenticados editam usuários" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (true);
