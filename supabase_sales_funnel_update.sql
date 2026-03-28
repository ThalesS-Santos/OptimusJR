-- Script para atualizar a tabela de Leads e adicionar o Funil de Vendas (CRM)
-- Execute isso no SQL Editor do Supabase

-- 1. Adicionar as novas colunas à tabela 'leads'
ALTER TABLE leads ADD COLUMN IF NOT EXISTS funnel_phase TEXT DEFAULT 'Primeiro Contato';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS funnel_data JSONB DEFAULT '{}'::jsonb;

-- 2. Criar o bucket de storage para os arquivos de anexos do funil (Propostas, Contratos, etc)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('funnel_docs', 'funnel_docs', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Configurar Segurança (RLS) para o Bucket 'funnel_docs'
CREATE POLICY "Arquivos do funil são púbicos para leitura" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'funnel_docs');

CREATE POLICY "Upload permitido apenas para autenticados no funil" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'funnel_docs');

CREATE POLICY "Atualização/Deleção de arquivos permitida aos autenticados" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'funnel_docs');

CREATE POLICY "Remoção de arquivos do funil permitida" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'funnel_docs');

-- Nota: Os novos leads cadastrados receberão automaticamente a fase 'Primeiro Contato'
-- A estrutura interna dos dados (Valores, Anexos, Respostas) será guardada na coluna funnel_data como um JSON.
