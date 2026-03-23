-- SCRIPT PARA CORRIGIR A BASE DE DADOS DE PROJETOS NO SUPABASE
-- Copie este código inteiro e cole na aba "SQL Editor" do seu painel Supabase e clique em "Run".

-- 1. Atualizar projetos antigos para os novos nomes de status (para não dar erro na restrição)
UPDATE public.projects SET status = 'Prospectando' WHERE status = 'Planejamento';
UPDATE public.projects SET status = 'Execução' WHERE status = 'Em Execução';
UPDATE public.projects SET status = 'Entregue' WHERE status = 'Concluído';

-- 2. Remover a restrição antiga de status
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- 3. Adicionar a capacidade de salvar Valor (value) e Prazo (deadline)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deadline DATE;

-- 4. Criar a nova restrição alinhada com as colunas do seu painel Kanban
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check 
CHECK (status IN ('Prospectando', 'Negociação', 'Execução', 'Testes/Revisão', 'Entregue'));
