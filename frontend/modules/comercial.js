import { supabase } from '../supabase-config.js';

window.funnelColumns = [
    'Primeiro Contato', 
    'Reunião diagnóstico', 
    'Qualificação', 
    'Escopo do projeto', 
    'Confecção da proposta', 
    'Apresentação da proposta', 
    'Contrato fechado', 
    'Negociação pausada'
];

window.renderComercial = async function(container) {
    document.getElementById('page-title').innerText = 'Comercial / CRM & Funil';
    if (!window.currentUser) return;

    const { data: leadsData, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    
    if (error) {
        container.innerHTML = window.renderSkeleton() + "<br><span style='color:red'>Erro no banco.</span>";
        console.error("Erro CRM:", error);
        return;
    }
    const leads = leadsData || [];

    // Assegura que todos os leads tenham uma fase associada (para velhos leads)
    leads.forEach(l => { if (!l.funnel_phase) l.funnel_phase = 'Primeiro Contato'; });

    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; border-bottom: 2px solid rgba(255,255,255,0.05); margin-bottom: 1.5rem; align-items: center;">
            <button onclick="window.toggleCommercialTab('tabela')" id="tab-tabela" style="background: transparent; border-bottom: 2px solid #10b981; border-radius: 0; width: auto; color: #10b981; padding: 0.5rem 1rem;">📋 Tabela de Leads</button>
            <button onclick="window.toggleCommercialTab('funil')" id="tab-funil" style="background: transparent; border-bottom: 2px solid transparent; border-radius: 0; width: auto; color: #9ca3af; padding: 0.5rem 1rem;">🚀 Funil de Vendas</button>
            
            ${window.currentUser.role !== 'Ex-Júnior' ? `<button onclick="window.openLeadModal()" style="margin-left: auto; width: auto; background: #10b981; border: none; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;"><span style="font-size: 1rem;">➕</span> Criar Lead / Oportunidade</button>` : `<div style="margin-left:auto;"></div>`}
        </div>

        <!-- VIEW TABELA -->
        <div id="view-tabela">
            <div class="card">
                <h3>Pipeline de Leads (Visão Geral)</h3>
                <div style="overflow-x: auto; width: 100%;">
                <table>
                    <thead>
                        <tr><th>Cliente/Empresa</th><th>Contato</th><th>Dor/Necessidade</th><th>Probabilidade</th><th>Fase no Funil</th></tr>
                    </thead>
                    <tbody>
                        ${leads.length > 0 ? leads.map(l => `
                            <tr>
                                <td><b>${l.name}</b></td>
                                <td>${l.contact}</td>
                                <td>${l.pain}</td>
                                <td><span style="padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; background: ${l.probability === 'Alta' ? 'rgba(16, 185, 129, 0.2)' : l.probability === 'Média' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${l.probability === 'Alta' ? '#10b981' : l.probability === 'Média' ? '#f59e0b' : '#ef4444'};">${l.probability}</span></td>
                                <td><span style="padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; background: rgba(59, 130, 246, 0.2); color: #60a5fa;">${l.funnel_phase}</span></td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Nenhum lead cadastrado</td></tr>'}
                    </tbody>
                </table>
                </div>
            </div>
        </div>

        <!-- VIEW FUNIL (KANBAN) -->
        <div id="view-funil" style="display: none;">
            <div class="kanban-board">
                ${window.funnelColumns.map(col => `
                    <div class="kanban-column" ondragover="window.allowLeadDrop(event)" ondrop="window.dropLead(event, '${col}')">
                        <h4>${col}</h4>
                        <div class="kanban-cards-container" id="kanban-lead-col-${col.replace(/ /g, '-')}">
                            ${leads.filter(l => l.funnel_phase === col).map(l => {
                                let colIdx = window.funnelColumns.indexOf(col);
                                let backBtn = colIdx > 0 ? `<button onclick="window.moveLeadMobile('${l.id}', '${window.funnelColumns[colIdx-1]}'); event.stopPropagation();" style="background:transparent; border:none; padding:0; font-size:1.2rem; cursor:pointer;" title="Recuar">⬅️</button>` : '';
                                let nextBtn = colIdx < window.funnelColumns.length - 1 ? `<button onclick="window.moveLeadMobile('${l.id}', '${window.funnelColumns[colIdx+1]}'); event.stopPropagation();" style="background:transparent; border:none; padding:0; font-size:1.2rem; cursor:pointer;" title="Avançar">➡️</button>` : '';
                                
                                return `
                                <div class="kanban-card" draggable="true" ondragstart="window.dragLead(event, '${l.id}')" onclick="window.openFunnelModal('${l.id}')" style="cursor: pointer;">
                                    <h5>${l.name}</h5>
                                    <p>${l.contact}</p>
                                    <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.5rem;">
                                        🕒 ${new Date(l.created_at).toLocaleDateString()}
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.03);">
                                        <div>${backBtn}</div>
                                        <span style="font-size: 0.7rem; color: var(--text-muted); text-decoration: underline;">Ver Detalhes</span>
                                        <div>${nextBtn}</div>
                                    </div>
                                </div>
                                `;
                            }).join('') || '<div style="text-align:center; color:rgba(255,255,255,0.1); padding:2rem; font-size:0.8rem;">Vazio</div>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Modal Cadastro Lead / Primeiro Contato -->
        <div id="lead-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 999; justify-content: center; align-items: center;">
            <div class="card" style="width: 400px; max-width: 90%; background: #111; padding: 2rem;">
                <h3>📋 Oportunidade / Lead</h3>
                <form id="lead-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                    <div><label>Empresa/Cliente</label><input type="text" id="l-name" required></div>
                    <div><label>Contato (Telefone/Email)</label><input type="text" id="l-contact" required></div>
                    <div><label>Dor / Necessidade</label><input type="text" id="l-pain" required></div>
                    <div><label>Probabilidade Inicial</label>
                        <select id="l-prob" style="width: 100%;">
                            <option value="Alta">Alta</option>
                            <option value="Média">Média</option>
                            <option value="Baixa">Baixa</option>
                        </select>
                    </div>
                    <button type="submit">Cadastrar no Funil</button>
                    <button type="button" onclick="window.closeLeadModal()" style="background: transparent; border: 1px solid #333; color: #9ca3af; margin-top: 0.5rem;">Cancelar</button>
                </form>
            </div>
        </div>

        <!-- Modal Detalhes Dinâmico (Funil) -->
        <div id="funnel-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; justify-content: center; align-items: center;">
            <div class="card" style="width: 500px; max-width: 95%; max-height: 90vh; overflow-y: auto; background: #111; padding: 2rem; position: relative;">
                <button onclick="window.closeFunnelModal()" style="position: absolute; right: 1rem; top: 1rem; background:transparent; border:none; color:white; font-size:1.5rem; padding:0; cursor:pointer;">&times;</button>
                <h3 id="fm-title" style="color: #3b82f6; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Funil</h3>
                
                <form id="funnel-form" style="display: flex; flex-direction: column; gap: 1rem;">
                    <input type="hidden" id="fm-lead-id">
                    <input type="hidden" id="fm-phase">
                    <div id="funnel-fields-container"></div>
                    
                    <button type="submit" id="btn-fm-save" style="margin-top: 1rem; background: #3b82f6;">Salvar Dados e Fechar</button>
                </form>
            </div>
        </div>
    `;

    // Ações de Tabs
    window.toggleCommercialTab = (tab) => {
        const isTabela = tab === 'tabela';
        document.getElementById('view-tabela').style.display = isTabela ? 'block' : 'none';
        document.getElementById('view-funil').style.display = isTabela ? 'none' : 'block';
        document.getElementById('tab-tabela').style.borderColor = isTabela ? '#10b981' : 'transparent';
        document.getElementById('tab-tabela').style.color = isTabela ? '#10b981' : '#9ca3af';
        document.getElementById('tab-funil').style.borderColor = !isTabela ? '#10b981' : 'transparent';
        document.getElementById('tab-funil').style.color = !isTabela ? '#10b981' : '#9ca3af';
    }

    // Ações Modal Básico (Criação)
    window.openLeadModal = () => { document.getElementById('lead-modal').style.display = 'flex'; }
    window.closeLeadModal = () => { document.getElementById('lead-modal').style.display = 'none'; }
    
    document.getElementById('lead-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('l-name').value;
        const contact = document.getElementById('l-contact').value;
        const pain = document.getElementById('l-pain').value;
        const probability = document.getElementById('l-prob').value;
        const status = 'Novo'; 
        const funnel_phase = 'Primeiro Contato';
        const funnel_data = {};

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerText = "Salvando...";
        submitBtn.disabled = true;

        const { error: insertError } = await supabase.from('leads').insert([{
            name, contact, pain, probability, status, funnel_phase, funnel_data, created_by: window.currentUser.uid
        }]);

        if (insertError) {
            window.showToast("Erro ao cadastrar lead: " + insertError.message, 'error');
            submitBtn.innerText = "Cadastrar no Funil";
            submitBtn.disabled = false;
        } else {
            window.showToast("Lead cadastrado com sucesso!", 'success');
            const msgLead = `Um novo prospecto / lead (${name}) entrou no Funil de Vendas na etapa de Primeiro Contato.`;
            window.notifyGlobalDirectors('🚀 Novo Lead no Funil!', msgLead);
            window.closeLeadModal();
            renderComercial(container);
        }
    });

    // Funções Drag & Drop
    window.allowLeadDrop = (e) => { if (window.currentUser.role === 'Ex-Júnior') return; e.preventDefault(); }
    window.dragLead = (e, leadId) => { if (window.currentUser.role === 'Ex-Júnior') return; e.dataTransfer.setData("text/plain", leadId); }
    window.dropLead = async (e, newPhase) => {
        if (window.currentUser.role === 'Ex-Júnior') return;
        e.preventDefault();
        const leadId = e.dataTransfer.getData("text/plain");
        if (!leadId) return;

        const { error } = await supabase.from('leads').update({ funnel_phase: newPhase }).eq('id', leadId);
        if(error) window.showToast("Erro ao mover lead: " + error.message, 'error');
        else renderComercial(document.getElementById('dashboard-content'));
    }
    window.moveLeadMobile = (id, newPhase) => {
        window.dropLead({ preventDefault: () => {}, dataTransfer: { getData: () => id } }, newPhase);
    }

    // Modal de Campos Específicos do Funil de Vendas
    window.leadsCache = leads; // guarda para acesso fácil
    window.openFunnelModal = (leadId) => {
        const lead = window.leadsCache.find(l => l.id === leadId);
        if(!lead) return;
        
        const phase = lead.funnel_phase || 'Primeiro Contato';
        const fdata = lead.funnel_data || {};
        let fieldsHtml = '';

        if (phase === 'Primeiro Contato') {
            fieldsHtml = `
                <div><label>Nome do Lead</label><input type="text" value="${lead.name}" disabled></div>
                <div><label>Telefone/Contato</label><input type="text" value="${lead.contact}" disabled></div>
                <div><label>Dores principais</label><input type="text" value="${lead.pain}" disabled></div>
                <p style="color:var(--text-muted); font-size:0.8rem; margin-top:0.5rem;">(As informações iniciais são editáveis apenas via banco ou recadastramento)</p>
            `;
        } else if (phase === 'Reunião diagnóstico') {
            fieldsHtml = `
                <div><label>Qual o tipo do serviço?</label><input type="text" id="fd-servicetype" value="${fdata.service_type || ''}" placeholder="Ex: Automação Residencial"></div>
                <div><label>Do que se trata o projeto? (resumo/prévia)</label><textarea id="fd-summary" style="width:100%; height:80px; padding:0.8rem; background:rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px;">${fdata.project_summary || ''}</textarea></div>
            `;
        } else if (phase === 'Qualificação') {
            fieldsHtml = `
                <div><label>Podemos ajudar esse lead?</label><input type="text" id="fd-canhelp" value="${fdata.can_help || ''}" placeholder="Sim, com a solução X"></div>
                <div><label>Prazo e urgência</label><input type="text" id="fd-urgency" value="${fdata.urgency || ''}" placeholder="Ex: Para o mês que vem"></div>
                <div><label>Condições para o orçamento?</label><input type="text" id="fd-budget" value="${fdata.budget_condition || ''}" placeholder="Sim / Parcial / Não"></div>
                <div><label>Lead é Totalmente Qualificado?</label>
                    <select id="fd-isqualified">
                        <option value="">Selecione</option>
                        <option value="Sim" ${fdata.is_qualified === 'Sim' ? 'selected' : ''}>Sim</option>
                        <option value="Não" ${fdata.is_qualified === 'Não' ? 'selected' : ''}>Não</option>
                    </select>
                </div>
            `;
        } else if (phase === 'Escopo do projeto') {
            fieldsHtml = `
                <div><label>Solução Formatada (Escopo detalhado)</label><textarea id="fd-solution" style="width:100%; height:100px; padding:0.8rem; background:rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px;">${fdata.solution || ''}</textarea></div>
                <div><label style="color:#10b981;">📄 Anexar Arquivos (Opcional - Escopo.pdf / img)</label><input type="file" id="fd-file">
                ${fdata.scope_attachment ? `<div style="margin-top:0.5rem; background:rgba(255,255,255,0.05); padding:0.5rem; border-radius:6px;"><a href="${fdata.scope_attachment}" target="_blank" style="color:#60a5fa; text-decoration:none;">🔗 Ver Anexo Salvo</a></div>` : ''}
                </div>
            `;
        } else if (phase === 'Confecção da proposta') {
            fieldsHtml = `
                <div><label>Data prevista da apresentação</label><input type="date" id="fd-presentationdate" value="${fdata.presentation_date || ''}"></div>
                <div><label style="color:#10b981;">📄 Anexar Proposta (Opcional)</label><input type="file" id="fd-file">
                ${fdata.proposal_attachment ? `<div style="margin-top:0.5rem; background:rgba(255,255,255,0.05); padding:0.5rem; border-radius:6px;"><a href="${fdata.proposal_attachment}" target="_blank" style="color:#60a5fa; text-decoration:none;">🔗 Ver Proposta Salva</a></div>` : ''}
                </div>
            `;
        } else if (phase === 'Apresentação da proposta') {
            fieldsHtml = `
                <div><label>Cliente demonstrou interesse?</label>
                    <select id="fd-interested">
                        <option value="">Selecione</option>
                        <option value="Sim" ${fdata.interested === 'Sim' ? 'selected' : ''}>Sim</option>
                        <option value="Não" ${fdata.interested === 'Não' ? 'selected' : ''}>Não</option>
                    </select>
                </div>
                <div><label>Necessidade de refazer proposta/ajustes?</label>
                    <select id="fd-otherprop">
                        <option value="">Selecione</option>
                        <option value="Sim" ${fdata.other_proposal === 'Sim' ? 'selected' : ''}>Sim</option>
                        <option value="Não" ${fdata.other_proposal === 'Não' ? 'selected' : ''}>Não</option>
                    </select>
                </div>
            `;
        } else if (phase === 'Contrato fechado') {
            fieldsHtml = `
                <div><label>Valor Fechado (R$)</label><input type="number" step="0.01" id="fd-val" value="${fdata.contract_value || ''}" placeholder="Ex: 2500.00"></div>
                <div><label>Parcelas</label><input type="number" id="fd-installments" value="${fdata.installments || ''}"></div>
                <div><label>Datas de Pagamento</label><input type="text" id="fd-paydates" value="${fdata.payment_dates || ''}" placeholder="Ex: Entrada amanhã, resto dia 10"></div>
                <div><label style="color:#10b981;">📄 Anexar Contrato Assinado (Opcional)</label><input type="file" id="fd-file">
                ${fdata.contract_attachment ? `<div style="margin-top:0.5rem; background:rgba(255,255,255,0.05); padding:0.5rem; border-radius:6px;"><a href="${fdata.contract_attachment}" target="_blank" style="color:#60a5fa; text-decoration:none;">🔗 Ver Contrato Salvo</a></div>` : ''}
                </div>
            `;
        } else if (phase === 'Negociação pausada') {
            fieldsHtml = `
                <div><label>Qual o motivo da pausa ou recusa?</label><textarea id="fd-pausereason" style="width:100%; height:60px; padding:0.8rem; background:rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px;">${fdata.pause_reason || ''}</textarea></div>
                <div><label>Vale a pena insistir no futuro?</label>
                    <select id="fd-worth">
                        <option value="">Selecione</option>
                        <option value="Sim" ${fdata.worth_insisting === 'Sim' ? 'selected' : ''}>Sim</option>
                        <option value="Não" ${fdata.worth_insisting === 'Não' ? 'selected' : ''}>Não</option>
                    </select>
                </div>
                <div><label>Erros observados / Feedback interno</label><textarea id="fd-errors" style="width:100%; height:60px; padding:0.8rem; background:rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px;">${fdata.observed_errors || ''}</textarea></div>
            `;
        }

        document.getElementById('funnel-fields-container').innerHTML = fieldsHtml;
        document.getElementById('fm-title').innerText = `Etapa: ${phase} (${lead.name})`;
        document.getElementById('fm-lead-id').value = lead.id;
        document.getElementById('fm-phase').value = phase;
        const btnSave = document.getElementById('btn-fm-save');
        if (btnSave) btnSave.style.display = window.currentUser.role === 'Ex-Júnior' ? 'none' : 'block';
        
        document.getElementById('funnel-modal').style.display = 'flex';
    };

    window.closeFunnelModal = () => { document.getElementById('funnel-modal').style.display = 'none'; };

    // Upload de arquivo globalizado
    window.uploadFunnelFile = async (file, leadId, prefix) => {
        const ext = file.name.split('.').pop();
        const fileName = `${prefix}_${leadId}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('funnel_docs').upload(fileName, file);
        if(error) throw error;
        const { data } = supabase.storage.from('funnel_docs').getPublicUrl(fileName);
        return data.publicUrl;
    };

    document.getElementById('funnel-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-fm-save');
        btn.innerText = 'Salvando...';
        btn.disabled = true;

        try {
            const id = document.getElementById('fm-lead-id').value;
            const phase = document.getElementById('fm-phase').value;
            const lead = window.leadsCache.find(l => l.id === id);
            let fdata = lead?.funnel_data || {};

            // Parse fields logic
            if(phase === 'Reunião diagnóstico') {
                fdata.service_type = document.getElementById('fd-servicetype').value;
                fdata.project_summary = document.getElementById('fd-summary').value;
            } else if(phase === 'Qualificação') {
                fdata.can_help = document.getElementById('fd-canhelp').value;
                fdata.urgency = document.getElementById('fd-urgency').value;
                fdata.budget_condition = document.getElementById('fd-budget').value;
                fdata.is_qualified = document.getElementById('fd-isqualified').value;
            } else if(phase === 'Escopo do projeto') {
                fdata.solution = document.getElementById('fd-solution').value;
                const file = document.getElementById('fd-file')?.files[0];
                if(file) fdata.scope_attachment = await window.uploadFunnelFile(file, id, 'scope');
            } else if(phase === 'Confecção da proposta') {
                fdata.presentation_date = document.getElementById('fd-presentationdate').value;
                const file = document.getElementById('fd-file')?.files[0];
                if(file) fdata.proposal_attachment = await window.uploadFunnelFile(file, id, 'proposal');
            } else if(phase === 'Apresentação da proposta') {
                fdata.interested = document.getElementById('fd-interested').value;
                fdata.other_proposal = document.getElementById('fd-otherprop').value;
            } else if(phase === 'Contrato fechado') {
                fdata.contract_value = document.getElementById('fd-val').value;
                fdata.installments = document.getElementById('fd-installments').value;
                fdata.payment_dates = document.getElementById('fd-paydates').value;
                const file = document.getElementById('fd-file')?.files[0];
                if(file) fdata.contract_attachment = await window.uploadFunnelFile(file, id, 'contract');
            } else if(phase === 'Negociação pausada') {
                fdata.pause_reason = document.getElementById('fd-pausereason').value;
                fdata.worth_insisting = document.getElementById('fd-worth').value;
                fdata.observed_errors = document.getElementById('fd-errors').value;
            }

            const { error } = await supabase.from('leads').update({ funnel_data: fdata }).eq('id', id);
            if(error) throw error;
            
            window.showToast("Informações do funil salvas com sucesso!", 'success');
            window.closeFunnelModal();
            renderComercial(document.getElementById('dashboard-content'));
        } catch (err) {
            console.error(err);
            window.showToast("Erro ao salvar: " + err.message, 'error');
        } finally {
            btn.innerText = 'Salvar Dados e Fechar';
            btn.disabled = false;
        }
    });
}

// --- CALENDÁRIO ---
const monthsName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const daysOfWeek = ["D", "S", "T", "Q", "Q", "S", "S"];

function generateCalendarDays(month, year) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
}

