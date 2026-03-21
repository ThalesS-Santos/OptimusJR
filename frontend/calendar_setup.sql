-- SCRIPT DE CRIAÇÃO DA TABELA DE CALENDÁRIO NO SUPABASE
-- Copie e cole este código no SQL Editor do seu painel do Supabase

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS (Row Level Security) - opcional
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública (Se desejar)
CREATE POLICY "Leitura Pública" ON calendar_events FOR SELECT USING (true);

-- Criar política de inserção (Permitir inserções de qualquer usuário autenticado ou anônimo para testes)
CREATE POLICY "Inserção Geral" ON calendar_events FOR INSERT WITH CHECK (true);

-- Criar política de exclusão
CREATE POLICY "Exclusão Geral" ON calendar_events FOR DELETE USING (true);
