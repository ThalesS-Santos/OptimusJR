-- Script para criação da tabela de Leads no Supabase

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    pain TEXT NOT NULL,
    probability TEXT NOT NULL,
    status TEXT DEFAULT 'Novo' NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ativar RLS (Row Level Security) caso deseje, mas configuraremos políticas abertas para uso interno da EJ
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Política de Leitura (Todos os usuários autenticados da EJ podem ver os leads)
CREATE POLICY "Leads são visíveis por usuários autenticados" 
ON leads FOR SELECT 
TO authenticated 
USING (true);

-- Política de Inserção (Qualquer usuário autenticado da EJ pode cadastrar)
CREATE POLICY "Leads podem ser criados por usuários autenticados" 
ON leads FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política de Atualização (Opcional - Caso queira atualizar status no futuro)
CREATE POLICY "Leads podem ser atualizados por usuários autenticados" 
ON leads FOR UPDATE 
TO authenticated 
USING (true);

-- Política de Deleção (Apenas administradores poderiam deletar um lead - ou todos os autenticados)
CREATE POLICY "Leads podem ser deletados por usuários autenticados" 
ON leads FOR DELETE 
TO authenticated 
USING (true);
