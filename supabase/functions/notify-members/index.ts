// supabase/functions/notify-members/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { event, data } = await req.json()

    // Inicializar Cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar todos os emails dos membros cadastrados na tabela users
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('email, name')
      
    if (fetchError) throw fetchError;

    const emails = users.map(u => u.email).filter(Boolean)

    // SUPORTE PARA MODO SANDBOX DO RESEND:
    // Enquanto o domínio não estiver verificado, você só pode enviar para o email cadastrado no Resend.
    // Vamos adicionar o seu email de testes de forma fixa para garantir que você receba!
    const testEmail = 'thalestatasena@gmail.com'; 
    if (!emails.includes(testEmail)) {
      emails.push(testEmail);
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum membro com email válido encontrado.' }), { status: 200 })
    }

    // 2. Montar template do Email baseado no Evento
    let subject = ''
    let htmlContent = ''

    if (event === 'project_created') {
        subject = `🚀 Novo Projeto: ${data.name}`
        htmlContent = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #15803d;">💡 Novo Projeto Cadastrado!</h2>
                <p>Olá Equipe Optimus JR,</p>
                <p>Um novo projeto foi adicionado ao sistema:</p>
                <ul>
                    <li><b>Nome:</b> ${data.name}</li>
                    <li><b>Status Inicial:</b> ${data.status}</li>
                    <li><b>Descrição:</b> ${data.description || 'Sem descrição.'}</li>
                </ul>
                <p>Acesse o dashboard para mais detalhes.</p>
            </div>
        `
    } else if (event === 'transaction_created') {
        const isReceita = data.type === 'Receita';
        subject = `${isReceita ? '📈 Entrada' : '📉 Saída'} Financeira registrada`
        htmlContent = `
             <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: ${isReceita ? '#10b981' : '#ef4444'};">${isReceita ? '💰 Entrada de Caixa' : '💸 Nova Despesa'}</h2>
                <p>Uma nova movimentação financeira foi lançada:</p>
                <ul>
                    <li><b>Tipo:</b> ${data.type}</li>
                    <li><b>Descrição:</b> ${data.description}</li>
                    <li><b>Valor:</b> R$ ${Number(data.amount).toFixed(2)}</li>
                    <li><b>Categoria:</b> ${data.category || 'Geral'}</li>
                </ul>
                <p>Confira o painel econômico.</p>
            </div>
        `
    }

    // 3. Enviar via API do Resend (Padrão Supabase)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Falta configurar a variável RESEND_API_KEY no Supabase Vault.' }), { status: 500 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'OptimusJR <onboarding@resend.dev>', // Ou domínios próprios verificados
        to: emails,
        subject: subject,
        html: htmlContent
      })
    })

    const resData = await res.json()
    return new Response(JSON.stringify({ success: true, data: resData }))

  } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
