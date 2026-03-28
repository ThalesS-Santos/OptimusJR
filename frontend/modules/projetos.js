import { supabase } from '../supabase-config.js';

window.renderProjetos = async function(container) {
    document.getElementById('page-title').innerText = 'Gestão de Projetos (Kanban)';
    if (!window.currentUser) return;

    try {
        const { data: projects, error } = await supabase
            .from('projects')
            .select(`*, users ( name )`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const canManageProjetos = window.currentUser?.role === 'Presidente' || window.currentUser?.dept === 'Projetos';
        const columns = ['Prospectando', 'Negociação', 'Execução', 'Testes/Revisão', 'Entregue'];

        container.innerHTML = `
            ${canManageProjetos ? `
            <div class="card" style="margin-bottom: 2rem;">
                <h3>🚀 Novo Projeto</h3>
                <form id="project-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                    <input type="text" id="p-name" placeholder="Nome do Projeto" required style="width: 100%;">
                    <textarea id="p-desc" placeholder="Descrição / Escopo" style="width: 100%; height: 80px; padding: 0.8rem; background: rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px; resize: vertical;"></textarea>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        <select id="p-status">
                            ${columns.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                        <input type="number" id="p-value" placeholder="Valor Negociado (R$)" step="0.01">
                        <input type="date" id="p-deadline">
                    </div>
                    <button type="submit">➕ Criar Projeto</button>
                </form>
            </div>
            ` : ''}

            <!-- Kanban Board -->
            <div class="kanban-board">
                ${columns.map(col => `
                    <div class="kanban-column" ondragover="window.allowDrop(event)" ondrop="window.dropProject(event, '${col}')">
                        <h4>${col}</h4>
                        <div class="kanban-cards-container" id="kanban-col-${col}">
                            ${projects?.filter(p => p.status === col).map(p => {
                                let colIdx = columns.indexOf(col);
                                let backBtn = colIdx > 0 ? `<button onclick="window.moveProjectMobile('${p.id}', '${columns[colIdx-1]}')" style="background:transparent; border:none; padding:0; font-size:1.2rem; cursor:pointer;" title="Recuar">⬅️</button>` : '';
                                let nextBtn = colIdx < columns.length - 1 ? `<button onclick="window.moveProjectMobile('${p.id}', '${columns[colIdx+1]}')" style="background:transparent; border:none; padding:0; font-size:1.2rem; cursor:pointer;" title="Avançar">➡️</button>` : '';

                                return `
                                <div class="kanban-card" draggable="true" ondragstart="window.dragProject(event, '${p.id}')">
                                    <h5>${p.name}</h5>
                                    <p>${p.description || 'Sem descrição.'}</p>
                                    <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.8rem;">
                                        💰 <b>R$ ${Number(p.value || 0).toFixed(2)}</b><br>
                                        📅 <b>Até:</b> ${p.deadline ? new Date(p.deadline).toLocaleDateString('pt-BR') : 'A definir'}
                                    </div>
                                    <div class="kanban-card-footer" style="padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.03); margin-bottom: 0.5rem;">
                                        <span>👤 ${p.users?.name || 'Vago'}</span>
                                        ${canManageProjetos ? `<button onclick="window.deleteProject('${p.id}')" style="background:transparent; color:#ef4444; padding:0; width:auto; font-size:0.8rem;" title="Deletar">🗑️</button>` : ''}
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem;">
                                        <div>${backBtn}</div>
                                        <span style="font-size: 0.7rem; color: var(--text-muted);">Mover</span>
                                        <div>${nextBtn}</div>
                                    </div>
                                </div>
                                `;
                            }).join('') || '<div style="text-align:center; color:rgba(255,255,255,0.1); padding:2rem; font-size:0.8rem;">Vazio</div>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        if (canManageProjetos) {
            document.getElementById('project-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('p-name').value;
                const description = document.getElementById('p-desc').value;
                const status = document.getElementById('p-status').value;
                const value = Number(document.getElementById('p-value').value) || 0;
                const deadline = document.getElementById('p-deadline').value;

                const { error: insertError } = await supabase
                    .from('projects')
                    .insert([{ name, description, status, value, deadline, created_by: window.currentUser.uid }]);

                if (insertError) {
                    window.showToast("Erro ao criar projeto: " + insertError.message, 'error');
                } else {
                    window.showToast("Projeto criado com sucesso!", 'success');
                    if (window.notifyDirectors) window.notifyDirectors('Novo Projeto 🌟', `O projeto "${name}" foi adicionado ao sistema!`);
                    if (window.notifyGlobalDirectors) window.notifyGlobalDirectors('Novo Projeto 🌟', `O projeto "${name}" foi adicionado ao sistema!`);
                    window.renderProjetos(container);
                }
            });
        }

    } catch (err) {
        container.innerHTML = '<div class="card">Erro ao carregar projetos.</div>';
    }
}

// Global Drag & Drop Handlers for Projects
window.allowDrop = (e) => {
    if (window.currentUser?.role === 'Ex-Júnior') return;
    e.preventDefault();
}

window.moveProjectMobile = (id, newStatus) => {
    window.dropProject({ preventDefault: () => {}, dataTransfer: { getData: () => id } }, newStatus);
}

window.dragProject = (e, projectId) => {
    if (window.currentUser?.role === 'Ex-Júnior') return;
    e.dataTransfer.setData("text/plain", projectId);
}

window.dropProject = async (e, newPhase) => {
    if (window.currentUser?.role === 'Ex-Júnior') return;
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain");
    if (!projectId) return;

    const { data: currentP } = await supabase.from('projects').select('name, status').eq('id', projectId).single();

    const { error } = await supabase.from('projects').update({ status: newPhase }).eq('id', projectId);
    
    if (error) window.showToast("Erro: " + error.message, 'error');
    else {
        if(currentP && currentP.status !== newPhase) {
            if (window.notifyGlobalDirectors) window.notifyGlobalDirectors('Projeto Avançou', `O projeto "${currentP.name}" mudou para a fase: ${newPhase}`);
        }
        window.renderProjetos(document.getElementById('dashboard-content')); 
    }
}

window.deleteProject = async (id) => {
    if (!confirm("Tem certeza que deseja deletar este projeto?")) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if(error) window.showToast("Erro ao deletar: " + error.message, 'error');
    else {
        window.showToast("Projeto deletado.", 'info');
        window.renderProjetos(document.getElementById('dashboard-content'));
    }
}

