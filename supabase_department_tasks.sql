-- Script SQL para criar a tabela de tarefas de departamento ("Minha Diretoria") no Supabase

DROP TABLE IF EXISTS department_tasks;

CREATE TABLE IF NOT EXISTS department_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    almost_done_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    department TEXT NOT NULL,
    status TEXT DEFAULT 'Nem comecei' NOT NULL CHECK (status IN ('Nem comecei', 'Em andamento', 'Quase concluído', 'Concluído')),
    assigned_to UUID REFERENCES public.users(uid) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(uid) ON DELETE SET NULL
);

ALTER TABLE department_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tarefas são visíveis aos usuários do sistema" 
ON department_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tarefas podem ser criadas por usuários autenticados" 
ON department_tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Tarefas podem ser atualizadas por usuários autenticados" 
ON department_tasks FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Tarefas podem ser deletadas por usuários autenticados" 
ON department_tasks FOR DELETE TO authenticated USING (true);
