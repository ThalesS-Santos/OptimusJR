-- SCRIPT DE CRIAÇÃO DA TABELA DE FEEDBACKS E IDEIAS NO SUPABASE
-- Copie e cole este código no SQL Editor do seu painel do Supabase

CREATE TABLE IF NOT EXISTS feedbacks_ideias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('feedback', 'ideia')),
    content TEXT NOT NULL,
    author TEXT, -- Se anônimo, este campo ficará vazio/nulo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS (Row Level Security) - opcional
ALTER TABLE feedbacks_ideias ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública (Se desejar)
CREATE POLICY "Leitura Pública Feedbacks" ON feedbacks_ideias FOR SELECT USING (true);

-- Criar política de inserção geral
CREATE POLICY "Inserção Geral Feedbacks" ON feedbacks_ideias FOR INSERT WITH CHECK (true);

-- Criar política de exclusão (Apenas por segurança, se quiser deletar)
CREATE POLICY "Exclusão Geral Feedbacks" ON feedbacks_ideias FOR DELETE USING (true);
