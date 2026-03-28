import { supabase } from '../supabase-config.js';

window.renderFinancas = async function(container) {
    document.getElementById('page-title').innerText = 'Painel Financeiro Unificado';
    if (!window.currentUser) return;

    const { data: txs, error } = await supabase
        .from('transactions')
        .select(`*, users(name)`)
        .order('date', { ascending: false });

    if (error) {
        container.innerHTML = '<div class="card">Erro ao carregar finanças.</div>';
        return;
    }

    const receita = txs?.filter(t => t.type === 'Receita').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const despesa = txs?.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const saldo = receita - despesa;

    const canManageFin = window.currentUser?.role === 'Presidente' || window.currentUser?.dept === 'Vice-Presidência';

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div class="card" style="border-left: 4px solid ${saldo >= 0 ? '#10b981' : '#ef4444'};">
                <small>💰 Saldo Consolidado</small>
                <h2 style="font-size: 2rem; color: ${saldo >= 0 ? '#10b981' : '#ef4444'};">R$ ${saldo.toFixed(2)}</h2>
            </div>
            <div class="card" style="border-left: 4px solid #10b981;">
                <small>📈 Receita Total</small>
                <h3 style="color: #10b981;">+ R$ ${receita.toFixed(2)}</h3>
            </div>
            <div class="card" style="border-left: 4px solid #ef4444;">
                <small>📉 Despesa Total</small>
                <h3 style="color: #ef4444;">- R$ ${despesa.toFixed(2)}</h3>
            </div>
        </div>

        <div class="card" style="padding: 1.5rem;">
            <div style="display: flex; gap: 1rem; border-bottom: 2px solid rgba(255,255,255,0.05); margin-bottom: 1.5rem;">
                <button onclick="window.toggleFinanceTab('entradas')" id="tab-entradas" style="background: transparent; border-bottom: 2px solid #10b981; border-radius: 0; width: auto; color: #10b981; padding: 0.5rem 1rem;">🟢 Entradas</button>
                <button onclick="window.toggleFinanceTab('saidas')" id="tab-saidas" style="background: transparent; border-bottom: 2px solid transparent; border-radius: 0; width: auto; color: #9ca3af; padding: 0.5rem 1rem;">🔴 Saídas</button>
            </div>

            ${canManageFin ? `
                <div id="form-entradas" class="finance-section">
                    <h4>➕ Registrar Entrada/Receita</h4>
                    <form id="income-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                        <input type="text" id="t-desc" placeholder="Descrição (Ex: Fechamento Projeto X)" required style="flex: 2;">
                        <input type="number" id="t-amount" placeholder="Valor (R$)" step="0.01" min="0.01" required style="flex: 1;">
                        <input type="text" id="t-cat" placeholder="Categoria (Ex: Projetos, Patrocínio)" required style="flex: 1;">
                        <input type="date" id="t-date" style="flex: 1;">
                        <button type="submit" style="background: #10b981;">✅ Salvar Entrada</button>
                    </form>
                </div>
                <div id="form-saidas" class="finance-section" style="display: none;">
                    <h4>💸 Registrar Saída/Gasto</h4>
                    <form id="expense-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                        <input type="text" id="g-desc" placeholder="Descrição (Ex: Servidor AWS)" required style="flex: 2;">
                        <input type="number" id="g-amount" placeholder="Valor (R$)" step="0.01" min="0.01" required style="flex: 1;">
                        <input type="text" id="g-cat" placeholder="Categoria (Ex: Operacional, Marketing)" required style="flex: 1;">
                        <input type="date" id="g-date" style="flex: 1;">
                        <button type="submit" style="background: #ef4444;">🚨 Salvar Gasto</button>
                    </form>
                </div>
            ` : `<p style="color: #9ca3af; font-size: 0.9rem;">Operação restrita à Presidência e Vice-Presidência.</p>`}
        </div>

        <div class="card" style="margin-top: 2rem;">
            <h3>📊 Extrato de Movimentações</h3>
            <div style="overflow-x: auto; margin-top: 1rem;">
                <table>
                    <thead>
                        <tr><th>Data</th><th>Fluxo</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Por</th></tr>
                    </thead>
                    <tbody>
                        ${txs?.map(t => `
                            <tr>
                                <td data-label="Data">${new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                <td data-label="Fluxo" style="color: ${t.type === 'Receita' ? '#10b981' : '#ef4444'}; font-weight: bold;">${t.type}</td>
                                <td data-label="Descrição">${t.description}</td>
                                <td data-label="Categoria"><span style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${t.category || 'Geral'}</span></td>
                                <td data-label="Valor" style="color: ${t.type === 'Receita' ? '#10b981' : '#ef4444'};">${t.type === 'Receita' ? '+' : '-'} R$ ${Number(t.amount).toFixed(2)}</td>
                                <td data-label="Por">${t.users?.name || '-'}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6">Sem movimentações.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (canManageFin) {
        document.getElementById('income-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await window.handleFinanceSubmit('Receita');
        });
        document.getElementById('expense-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await window.handleFinanceSubmit('Despesa');
        });
    }
};

window.toggleFinanceTab = (tab) => {
    const isEntrada = tab === 'entradas';
    const formEntradas = document.getElementById('form-entradas');
    const formSaidas = document.getElementById('form-saidas');
    if (!formEntradas || !formSaidas) return;

    formEntradas.style.display = isEntrada ? 'block' : 'none';
    formSaidas.style.display = isEntrada ? 'none' : 'block';
    
    document.getElementById('tab-entradas').style.borderColor = isEntrada ? '#10b981' : 'transparent';
    document.getElementById('tab-entradas').style.color = isEntrada ? '#10b981' : '#9ca3af';
    document.getElementById('tab-saidas').style.borderColor = !isEntrada ? '#ef4444' : 'transparent';
    document.getElementById('tab-saidas').style.color = !isEntrada ? '#ef4444' : '#9ca3af';
};

window.handleFinanceSubmit = async (type) => {
    const isIncome = type === 'Receita';
    const prefix = isIncome ? 't' : 'g';
    const description = document.getElementById(`${prefix}-desc`).value;
    const amount = Number(document.getElementById(`${prefix}-amount`).value);
    const category = document.getElementById(`${prefix}-cat`).value || 'Geral';
    const date = document.getElementById(`${prefix}-date`).value || new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('transactions').insert([{ 
        type, 
        description, 
        amount, 
        date, 
        category, 
        created_by: window.currentUser.uid 
    }]);

    if (error) {
        window.showToast("Erro ao registrar: " + error.message, 'error');
    } else {
        window.showToast(`${type} registrada com sucesso!`, 'success');
        
        if (type === 'Despesa') {
            const msgGasto = `Um novo gasto de R$ ${amount.toFixed(2)} (${description}) foi registrado por ${window.currentUser.name || 'Membro'}.`;
            window.notifyGlobalDirectors('📉 Novo Gasto Registrado', msgGasto);
            if (window.sendEmailNotification) {
                window.sendEmailNotification({
                    subject: '📉 Novo Gasto Registrado',
                    message: msgGasto
                });
            }
        }
        window.renderFinancas(document.getElementById('dashboard-content'));
    }
};

window.renderDashboardCharts = (txs) => {
    const canvasFin = document.getElementById('financialChart');
    if (!canvasFin) return;
    const ctxFin = canvasFin.getContext('2d');
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    const revData = Array(12).fill(0);
    const expData = Array(12).fill(0);

    txs.forEach(t => {
        const d = new Date(t.date);
        const m = d.getMonth();
        if (t.type === 'Receita') revData[m] += Number(t.amount);
        else expData[m] += Number(t.amount);
    });

    new Chart(ctxFin, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: 'Receitas', data: revData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, fill: true },
                { label: 'Despesas', data: expData, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 2, fill: true }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { y: { ticks: { color: '#9ca3af' } }, x: { ticks: { color: '#9ca3af' } } } }
    });

    const canvasCat = document.getElementById('categoryChart');
    if (!canvasCat) return;
    const ctxCat = canvasCat.getContext('2d');
    const expenses = txs.filter(t => t.type === 'Despesa');
    const catMap = {};
    expenses.forEach(e => {
        const cat = e.category || 'Geral';
        catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
    });

    new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catMap),
            datasets: [{
                data: Object.values(catMap),
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });
};

window.openReportModal = () => {
    const modal = document.getElementById('report-modal-overlay');
    if (modal) {
        document.getElementById('report-notes-input').value = '';
        modal.style.display = 'flex';
    }
};

window.closeReportModal = () => {
    const modal = document.getElementById('report-modal-overlay');
    if (modal) modal.style.display = 'none';
};

window.confirmReport = () => {
    const notes = document.getElementById('report-notes-input').value;
    window.closeReportModal();
    window.imprimirRelatorio(notes);
};

window.imprimirRelatorio = (notes) => {
    const data = window.currentDashboardData;
    if (!data) return window.showToast("Erro ao carregar dados do relatório", 'error');

    const printWindow = window.open('', '_blank');
    const expenses = data.txs.filter(t => t.type === 'Despesa').sort((a,b) => b.amount - a.amount).slice(0, 5);

    printWindow.document.write(`
        <html>
        <head>
            <title>Relatório Gerencial - Optimus Jr.</title>
            <style>
                body { font-family: 'Inter', sans-serif; color: #111; padding: 2rem; max-width: 800px; margin: 0 auto; }
                header { border-bottom: 3px solid #15803d; padding-bottom: 1rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
                h1 { color: #15803d; margin: 0; }
                .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
                .card { border: 1px solid #ddd; padding: 1.5rem; border-radius: 8px; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                th, td { border: 1px solid #ddd; padding: 0.8rem; text-align: left; }
                th { background: #f4f4f4; }
                .note { background: #f9f9f9; padding: 1rem; border-left: 4px solid #3b82f6; margin-bottom: 2rem; }
            </style>
        </head>
        <body>
            <header>
                <div>
                     <h1>📊 Relatório Gerencial</h1>
                     <small>Optimus Jr. - ${new Date().toLocaleDateString('pt-BR')}</small>
                </div>
            </header>

            ${notes ? `<div class="note"><b>📝 Notas do Gestor:</b><p>${notes.replace(/\n/g, '<br>')}</p></div>` : ''}

            <div class="grid">
                <div class="card"><h3>Receita Mês</h3><p style="color:#10b981; font-weight:bold; font-size:1.5rem;">R$ ${data.revCurrent.toFixed(2)}</p></div>
                <div class="card"><h3>Despesa Mês</h3><p style="color:#ef4444; font-weight:bold; font-size:1.5rem;">R$ ${data.expCurrent.toFixed(2)}</p></div>
                <div class="card"><h3>Lucro Mês</h3><p style="color:#22c55e; font-weight:bold; font-size:1.5rem;">R$ ${data.profitCurrent.toFixed(2)}</p></div>
            </div>

            <h2>🔥 Maiores Despesas do Período</h2>
            <table>
                <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead>
                <tbody>
                    ${expenses.map(e => `<tr><td>${new Date(e.date).toLocaleDateString('pt-BR')}</td><td>${e.description}</td><td>${e.category || 'Geral'}</td><td>R$ ${Number(e.amount).toFixed(2)}</td></tr>`).join('')}
                </tbody>
            </table>

            <h2>🚀 Resumo de Projetos</h2>
            <p>Ativos: <b>${data.projects.filter(p => p.status !== 'Concluído').length}</b> | Concluídos: <b>${data.projects.filter(p => p.status === 'Concluído').length}</b></p>

            <script>
                setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};
