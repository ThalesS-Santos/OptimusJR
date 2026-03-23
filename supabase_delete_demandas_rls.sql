-- 1. Garante que RLS está habilitado na tabela de tarefas do departamento
ALTER TABLE public.department_tasks ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas conflitantes de exclusão (se existirem)
DROP POLICY IF EXISTS "Diretores podem excluir demandas" ON public.department_tasks;

-- 3. Cria a política que permite EXCLUSÃO apenas para Diretores e Presidentes
CREATE POLICY "Diretores podem excluir demandas"
ON public.department_tasks
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE public.users.uid = auth.uid() 
        AND (public.users.role = 'Diretor' OR public.users.role = 'Presidente')
    )
);
