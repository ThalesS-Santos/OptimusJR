import { supabase } from './supabase-config.js';

// --- NOTIFICAÇÕES (EmailJS) ---
async function sendEmailNotification(subjectParams) {
    try {
        const { data: users, error } = await supabase.from('users').select('email');
        if (error) throw error;
        
        const emails = users.map(u => u.email).filter(Boolean);
        
        // Disparar um email para cada membro
        for (const email of emails) {
            emailjs.send('service_2blmih4', 'template_7j2d1ml', {
                ...subjectParams,
                to_email: email  // emailjs usará {{to_email}} se configurado no cabeçalho do template
            }).catch(console.error);
        }
    } catch (err) {
        console.error("Erro ao carregar lista de emails:", err);
    }
}

// --- CUSTOM DIALOGS ---
window.customAlert = (title, message, icon = '🔔') => {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal-overlay');
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;
        document.getElementById('modal-icon').innerText = icon;
        
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        
        confirmBtn.style.background = '#10b981';
        confirmBtn.innerText = 'OK';
        cancelBtn.style.display = 'none'; // Esconde Cancelar para Alerta
        
        overlay.style.display = 'flex';
        setTimeout(() => {
            modal.style.transform = 'scale(1)';
            modal.style.opacity = '1';
        }, 10);

        confirmBtn.onclick = () => {
             modal.style.transform = 'scale(0.9)';
             modal.style.opacity = '0';
             setTimeout(() => overlay.style.display = 'none', 150);
             resolve();
        };
    });
}

window.customConfirm = (title, message, icon = '⚠️') => {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal-overlay');
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;
        document.getElementById('modal-icon').innerText = icon;
        
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        
        confirmBtn.style.background = '#ef4444'; // Vermelho para perigo
        confirmBtn.innerText = 'Confirmar';
        cancelBtn.style.display = 'block';
        
        overlay.style.display = 'flex';
        setTimeout(() => {
            modal.style.transform = 'scale(1)';
            modal.style.opacity = '1';
        }, 10);

        confirmBtn.onclick = () => {
             modal.style.transform = 'scale(0.9)';
             modal.style.opacity = '0';
             setTimeout(() => overlay.style.display = 'none', 150);
             resolve(true);
        };

        cancelBtn.onclick = () => {
             modal.style.transform = 'scale(0.9)';
             modal.style.opacity = '0';
             setTimeout(() => overlay.style.display = 'none', 150);
             resolve(false);
        };
    });
}

// Sobrescrever Alert Nativo para ser Global
window.alert = (message) => {
    customAlert('Aviso', message);
};

// State
let currentUser = null;
let currentPage = 'home';

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view'),
    errMsg: document.getElementById('auth-error')
};

// --- AUTHENTICATION ---

window.loginWithGoogle = async () => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    } catch (error) {
        views.errMsg.innerText = error.message;
        views.errMsg.classList.remove('hidden');
    }
}

window.logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
}

async function checkUserInPostgres(authUser) {
    const { data: userSnap, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', authUser.id)
        .single();

    if (userSnap) {
        currentUser = userSnap;
    } else {
        // First Login - Create Profile
        const newUser = {
            uid: authUser.id,
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
            email: authUser.email,
            photoURL: authUser.user_metadata?.avatar_url || 'https://via.placeholder.com/40',
            role: "Membro", // Default
            dept: "Geral",   // Default
            bio: "Novo membro da Optimus JR",
            skills: "Iniciante"
        };
        const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();
            
        if (insertError) {
             console.error("Erro ao criar perfil no Supabase:", insertError);
             return;
        }
        currentUser = insertedUser;
    }
    showDashboard();
}

supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        checkUserInPostgres(session.user);
    } else {
        views.dashboard.classList.add('hidden');
        views.auth.classList.remove('hidden');
    }
});

// --- NAVIGATION ---

function showDashboard() {
    views.auth.classList.add('hidden');
    views.dashboard.classList.remove('hidden');
    
    // Header Info
    const avatar = currentUser?.photoURL || 'https://via.placeholder.com/40';
    document.getElementById('user-profile-widget').innerHTML = `
        <div style="display:flex; align-items:center; gap:1rem;">
            <div style="text-align: right;">
                <span style="display:block; font-weight:bold;">${currentUser?.name || 'Carregando...'}</span>
                <small style="color: var(--text-muted)">${currentUser?.role || ''} • ${currentUser?.dept || ''}</small>
            </div>
            <img src="${avatar}" style="width:40px; height:40px; border-radius:50%; border:2px solid var(--primary); object-fit: cover;">
        </div>
    `;

    if (!currentUser.role || currentUser.role === 'Membro' && currentUser.dept === 'Geral') {
        alert("👋 Bem-vindo! Por favor, atualize o seu Cargo e Departamento no seu perfil.");
        navTo('perfil'); // Força ir pro perfil para preencher
    } else {
        navTo('home');
    }
}

window.toggleMenu = () => {
    document.querySelector('.sidebar').classList.toggle('open');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

window.deleteProject = async (projectId) => {
    if (!await customConfirm("Excluir Projeto", "Tem certeza que deseja excluir permanentemente este projeto?")) return;
    
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
        
    if (error) {
        alert("Erro ao excluir: " + error.message);
    } else {
        alert("Projeto excluído!");
        loadContent(); // Recarrega a view atual
    }
}

window.navTo = (page) => {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Highlight active
    const activeBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.innerText.toLowerCase().includes(page) || b.getAttribute('onclick')?.includes(page));
    if(activeBtn) activeBtn.classList.add('active');

    // Fechar menu no mobile ao navegar
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay').classList.remove('active');

    loadContent();
}

async function loadContent() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = '<div style="text-align:center; padding:2rem;">Carregando...</div>';

    switch(currentPage) {
        case 'home': await renderHome(container); break;
        case 'perfil': await renderProfile(container); break;
        case 'membros': await renderMembros(container); break;
        case 'projetos': await renderProjetos(container); break;
        case 'historia': renderHistoria(container); break;
        case 'financas': await renderFinancas(container); break;
        case 'comercial': await renderComercial(container); break;
        default: container.innerHTML = '<div class="card">Página não encontrada</div>';
    }
}

// --- PAGES ---

async function renderHome(container) {
    document.getElementById('page-title').innerText = 'Dashboard Gerencial';
    if (!currentUser) return;

    container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted)">📊 Carregando métricas e análises...</div>`;

    try {
        const [txsResult, projsResult, usersResult] = await Promise.all([
            supabase.from('transactions').select('*'),
            supabase.from('projects').select('*'),
            supabase.from('users').select('*')
        ]);

        const txs = txsResult.data || [];
        const projects = projsResult.data || [];
        const members = usersResult.data || [];

        // Cálculos e KPIs
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const currentMonthTxs = txs.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const revCurrent = currentMonthTxs.filter(t => t.type === 'Receita').reduce((sum, t) => sum + Number(t.amount), 0);
        const expCurrent = currentMonthTxs.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + Number(t.amount), 0);
        const profitCurrent = revCurrent - expCurrent;

        // Comparativo Mês Passado
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const prevMonthTxs = txs.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
        });
        const revPrev = prevMonthTxs.filter(t => t.type === 'Receita').reduce((sum, t) => sum + Number(t.amount), 0);
        const revVar = revPrev > 0 ? ((revCurrent - revPrev) / revPrev) * 100 : 0;

        const activeProjs = projects.filter(p => p.status === 'Em Execução' || p.status === 'Planejamento').length;
        const doneProjs = projects.filter(p => p.status === 'Concluído').length;
        const ticketMedio = projects.length > 0 ? (txs.filter(t => t.type === 'Receita').reduce((s,t) => s + Number(t.amount), 0) / projects.length) : 0;

        container.innerHTML = `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
                <button onclick="window.openReportModal()" style="width: auto; background: #3b82f6; border: none; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.5rem;"><span style="font-size: 1.2rem;">📊</span> Gerar Relatório de Desempenho</button>
            </div>

            <!-- OKRs / Metas -->
            <div class="okrs-container">
                <div class="okr-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #fff;">🎯 Faturamento Semestral</span>
                        <small style="color: #6b7280; font-weight: bold;">0%</small>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar-fill" style="width: 0%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                        <span>Alcançado: R$ 0,00</span>
                        <span>Meta: R$ 0,00</span>
                    </div>
                </div>
                <div class="okr-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #fff;">🚀 Projetos Fechados</span>
                        <small style="color: #6b7280; font-weight: bold;">0%</small>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar-fill" style="width: 0%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                        <span>Alcançado: 0</span>
                        <span>Meta: 0</span>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="card" style="border-left: 4px solid #10b981;">
                    <small>💰 Receita do Mês</small>
                    <h2 style="font-size: 1.8rem; color: #10b981;">R$ ${revCurrent.toFixed(2)}</h2>
                    <p style="font-size: 0.8rem; color: ${revVar >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">${revVar >= 0 ? '▲' : '▼'} ${Math.abs(revVar).toFixed(1)}% vs Mês Passado</p>
                </div>
                <div class="card" style="border-left: 4px solid #ef4444;">
                    <small>📉 Gasto do Mês</small>
                    <h2 style="font-size: 1.8rem; color: #ef4444;">R$ ${expCurrent.toFixed(2)}</h2>
                </div>
                <div class="card" style="border-left: 4px solid #22c55e;">
                    <small>📈 Lucro do Mês</small>
                    <h2 style="font-size: 1.8rem; color: ${profitCurrent >= 0 ? '#10b981' : '#ef4444'};">R$ ${profitCurrent.toFixed(2)}</h2>
                </div>
                <div class="card" style="border-left: 4px solid #3b82f6;">
                    <small>🚀 Projetos Ativos</small>
                    <h2 style="font-size: 1.8rem; color: #3b82f6;">${activeProjs}</h2>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="card">
                    <h3>📊 Evolução Financeira</h3>
                    <div style="height: 250px; position: relative;"><canvas id="financialChart"></canvas></div>
                </div>
                <div class="card">
                    <h3>🍕 Despesas por Categoria</h3>
                    <div style="height: 250px; position: relative;"><canvas id="categoryChart"></canvas></div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                <div class="card">
                    <h3>📈 Estatísticas Gerais</h3>
                    <ul style="list-style: none; padding: 0; line-height: 2; color: #e5e7eb;">
                        <li>🔹 <b>Ticket Médio:</b> R$ ${ticketMedio.toFixed(2)}</li>
                        <li>🔹 <b>Projetos Finalizados:</b> ${doneProjs}</li>
                        <li>🔹 <b>Total de Membros:</b> ${members.length}</li>
                    </ul>
                </div>
                <div class="card" style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <h4 style="margin-bottom: 0.5rem; color: #fff;">Gestão de Alto Nível</h4>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">Todos os membros acompanham a saúde da OptimusJr.</p>
                    <button onclick="navTo('financas')" style="width: auto; padding: 0.5rem 1.2rem; font-size: 0.85rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">Ver Detalhes</button>
                </div>
            </div>
        `;

        setTimeout(() => {
             renderDashboardCharts(txs);
        }, 150);

        // Store data globally for report generation
        window.currentDashboardData = { txs, projects, members, revCurrent, expCurrent, profitCurrent };

    } catch (e) {
        container.innerHTML = `<div class="card">Erro ao carregar Dashboard. Amostras indisponíveis.</div>`;
    }
}

async function renderProfile(container) {
    document.getElementById('page-title').innerText = 'Meu Perfil';
    if (!currentUser) return;
    
    container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="position: relative; display: inline-block;">
                    <img id="profile-img-preview" src="${currentUser.photoURL}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary);">
                    <label for="file-upload" style="position: absolute; bottom: 0; right: 0; background: var(--primary); padding: 0.5rem; border-radius: 50%; cursor: pointer;">📷</label>
                    <input type="file" id="file-upload" accept="image/*" style="display: none;" onchange="uploadPhoto(this)">
                </div>
                <h2 style="margin-top: 1rem;">${currentUser.name}</h2>
                <p class="text-muted">${currentUser.email}</p>
            </div>

            <div class="form-group">
                <label>Bio</label>
                <textarea id="edit-bio" style="width: 100%; padding: 1rem; background: rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px;">${currentUser.bio || ''}</textarea>
            </div>

            <div class="form-group">
                <label>🎯 Cargo</label>
                <select id="edit-role" style="width: 100%;">
                    <option value="Membro" ${currentUser.role === 'Membro' ? 'selected' : ''}>Membro</option>
                    <option value="Diretor" ${currentUser.role === 'Diretor' ? 'selected' : ''}>Diretor</option>
                    <option value="Presidente" ${currentUser.role === 'Presidente' ? 'selected' : ''}>Presidente</option>
                </select>
            </div>

            <div class="form-group">
                <label>📂 Departamento</label>
                <select id="edit-dept" style="width: 100%;">
                    <option value="Projetos" ${currentUser.dept === 'Projetos' ? 'selected' : ''}>Projetos</option>
                    <option value="Marketing" ${currentUser.dept === 'Marketing' ? 'selected' : ''}>Marketing</option>
                    <option value="Comunicação" ${currentUser.dept === 'Comunicação' ? 'selected' : ''}>Comunicação</option>
                    <option value="Gestão de Pessoas" ${currentUser.dept === 'Gestão de Pessoas' ? 'selected' : ''}>Gestão de Pessoas</option>
                    <option value="Vice-Presidência" ${currentUser.dept === 'Vice-Presidência' ? 'selected' : ''}>Vice-Presidência</option>
                    <option value="Presidência" ${currentUser.dept === 'Presidência' ? 'selected' : ''}>Presidência</option>
                </select>
            </div>

             <div class="form-group">
                <label>Habilidades (Skills)</label>
                <input type="text" id="edit-skills" value="${currentUser.skills || ''}">
            </div>

            <button onclick="saveProfile()">💾 Salvar Perfil</button>
        </div>
    `;
}

window.uploadPhoto = async (input) => {
    const file = input.files[0];
    if (!file) return;

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.uid}.${fileExt}`;
        
        // CUIDADO COM O NOME DO ARQUIVO PRA N OCORRER CASHING SE BATER NA URL
        const filePath = `${fileName}`; 

        const { error: uploadError } = await supabase.storage
            .from('profile_photos')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('profile_photos')
            .getPublicUrl(filePath);
            
        // Força recarregamento da imagem
        const cacheBurstUrl = `${publicUrl}?t=${new Date().getTime()}`;

        const { error: updateError } = await supabase
            .from('users')
            .update({ photoURL: cacheBurstUrl })
            .eq('uid', currentUser.uid);

        if (updateError) throw updateError;
        
        currentUser.photoURL = cacheBurstUrl;
        document.getElementById('profile-img-preview').src = cacheBurstUrl;
        
        const headerAvatar = document.querySelector('#user-profile-widget img');
        if(headerAvatar) headerAvatar.src = cacheBurstUrl;
        
        alert("Foto atualizada!");
    } catch (err) {
        console.error(err);
        alert("Erro ao enviar foto: " + err.message);
    }
}

window.saveProfile = async () => {
    const bio = document.getElementById('edit-bio').value;
    const skills = document.getElementById('edit-skills').value;
    const role = document.getElementById('edit-role').value;
    const dept = document.getElementById('edit-dept').value;
    
    // --- GUARDA DE PERMISSÕES ---
    const { data: allUsers } = await supabase.from('users').select('uid, role, dept');
    
    const presidents = allUsers?.filter(u => u.role === 'Presidente' && u.uid !== currentUser.uid) || [];
    if (role === 'Presidente' && presidents.length > 0) {
        alert("🚨 Negado: Só pode haver um Presidente cadastrado!");
        return;
    }
    
    const directors = allUsers?.filter(u => u.dept === dept && u.role === 'Diretor' && u.uid !== currentUser.uid) || [];
    if (role === 'Diretor' && directors.length > 0) {
         alert(`🚨 Negado: Já existe um Diretor no departamento ${dept}!`);
         return;
    }
    // ----------------------------
    
    const { error: updateError } = await supabase
        .from('users')
        .update({ bio, skills, role, dept })
        .eq('uid', currentUser.uid);
        
    if (updateError) {
        alert("Erro ao salvar o perfil!");
        console.error(updateError);
        return;
    }
        
    currentUser.bio = bio;
    currentUser.skills = skills;
    currentUser.role = role;
    currentUser.dept = dept;
    
    alert("Perfil Atualizado com sucesso!");
    showDashboard(); // Recarrega header e redireciona para home
}

async function renderMembros(container) {
    document.getElementById('page-title').innerText = 'Membros da EJ';
    
    const { data: members, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
        
    if (error) {
        container.innerHTML = '<div class="card">Erro ao carregar membros.</div>';
        console.error(error);
        return;
    }

    container.innerHTML = `
        <div class="card">
            <h3>Nossa Equipe</h3>
            <table>
                <thead>
                    <tr><th>Membro</th><th>Cargo</th><th>Depto</th></tr>
                </thead>
                <tbody>
                    ${members?.map(m => `
                        <tr>
                            <td data-label="Membro" style="display:flex; align-items:center; gap:0.5rem;">
                                <img src="${m.photoURL || 'https://via.placeholder.com/30'}" style="width:30px; height:30px; border-radius:50%; object-fit: cover;">
                                ${m.name || 'Sem nome'}
                            </td>
                            <td data-label="Cargo">${m.role || '-'}</td>
                            <td data-label="Depto">${m.dept || '-'}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="3">Nenhum membro encontrado.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

async function renderProjetos(container) {
    document.getElementById('page-title').innerText = 'Gestão de Projetos (Kanban)';
    if (!currentUser) return;

    try {
        const { data: projects, error } = await supabase
            .from('projects')
            .select(`*, users ( name )`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const canManageProjetos = currentUser?.role === 'Presidente' || currentUser?.dept === 'Projetos';
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
                            ${projects?.filter(p => p.status === col).map(p => `
                                <div class="kanban-card" draggable="true" ondragstart="window.dragProject(event, '${p.id}')">
                                    <h5>${p.name}</h5>
                                    <p>${p.description || 'Sem descrição.'}</p>
                                    <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.8rem;">
                                        💰 <b>R$ ${Number(p.value || 0).toFixed(2)}</b><br>
                                        📅 <b>Até:</b> ${p.deadline ? new Date(p.deadline).toLocaleDateString('pt-BR') : 'A definir'}
                                    </div>
                                    <div class="kanban-card-footer">
                                        <span>👤 ${p.users?.name || 'Vago'}</span>
                                        ${canManageProjetos ? `<button onclick="window.deleteProject('${p.id}')" style="background:transparent; color:#ef4444; padding:0; width:auto; font-size:0.8rem;" title="Deletar">🗑️</button>` : ''}
                                    </div>
                                </div>
                            `).join('') || '<div style="text-align:center; color:rgba(255,255,255,0.1); padding:2rem; font-size:0.8rem;">Vazio</div>'}
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
                    .insert([{ name, description, status, value, deadline, created_by: currentUser.uid }]);

                if (insertError) {
                    alert("Erro ao criar projeto: " + insertError.message);
                } else {
                    alert("Projeto criado com sucesso!");
                    renderProjetos(container);
                }
            });
        }

    } catch (err) {
        container.innerHTML = '<div class="card">Erro ao carregar projetos.</div>';
    }
}

// Global Drag & Drop Handlers for Projects
window.allowDrop = (e) => {
    e.preventDefault();
}

window.dragProject = (e, projectId) => {
    e.dataTransfer.setData("text/plain", projectId);
}

window.dropProject = async (e, newStatus) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain");

    if (projectId) {
        const { error } = await supabase
            .from('projects')
            .update({ status: newStatus })
            .eq('id', projectId);

        if (error) {
            alert("Erro ao mover projeto: " + error.message);
        } else {
            const container = document.getElementById('dashboard-content');
            if (currentPage === 'projetos') {
                renderProjetos(container);
            }
        }
    }
}

function renderHistoria(container) {
    document.getElementById('page-title').innerText = 'História';
    container.innerHTML = `
        <div class="card" style="margin-bottom: 2rem;">
            <h3>📜 Nossa História</h3>
            <p style="line-height: 1.6; white-space: pre-line; color: #e2e8f0;">
                A OPTIMUS Jr. foi fundada em 2010, na Universidade Federal da Bahia (UFBA), como a empresa júnior do curso de Engenharia de Controle e Automação. Desde o início, surgiu com o propósito de desenvolver seus membros por meio da vivência empresarial, transformando conhecimento acadêmico em soluções práticas.

                Ao longo dos anos, a empresa passou por um processo de crescimento e consolidação, iniciando seus primeiros projetos com clientes reais e estruturando suas diretorias internas, como Projetos, Comercial, Marketing, Gestão de Pessoas e Financeiro.

                Com o tempo, expandiu sua atuação, passando a oferecer soluções em automação residencial, comercial e industrial, além de fortalecer parcerias com empresas e integrar ativamente o Movimento Empresa Júnior, por meio do NEJ Salvador.

                Hoje, com mais de uma década de atuação, a OPTIMUS Jr. se destaca pela qualidade dos seus projetos, pelo desenvolvimento dos seus membros e pelo compromisso em entregar soluções inovadoras que geram conforto, praticidade e economia para seus clientes.
            </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
            <div class="card" style="border-top: 4px solid #10b981;">
                <h3 style="color: #10b981; margin-bottom: 1rem;">🎯 Missão</h3>
                <p style="font-size: 0.95rem; line-height: 1.6; color: #e2e8f0;">Desenvolver nossos membros na área de automação por meio da vivência empresarial, sempre buscando oferecer a melhor experiência possível para os clientes.</p>
            </div>
            <div class="card" style="border-top: 4px solid #3b82f6;">
                <h3 style="color: #3b82f6; margin-bottom: 1rem;">👁️ Visão</h3>
                <p style="font-size: 0.95rem; line-height: 1.6; color: #e2e8f0;">Atuar de forma constante no mercado de automação, oferecendo soluções de alta qualidade com preços justos, gerando conforto, praticidade e economia.</p>
            </div>
            <div class="card" style="border-top: 4px solid #eab308;">
                <h3 style="color: #eab308; margin-bottom: 1rem;">💎 Valores</h3>
                <ul style="list-style: none; padding: 0; line-height: 2; font-size: 0.95rem; color: #e2e8f0;">
                    <li>🔹 Autonomia</li>
                    <li>🔹 Resiliência</li>
                    <li>🔹 Comprometimento com resultados</li>
                    <li>🔹 Sentimento de dono</li>
                    <li>🔹 Orgulho de ser OPTIMUS</li>
                </ul>
            </div>
        </div>
    `;
}

async function renderFinancas(container) {
    document.getElementById('page-title').innerText = 'Painel Financeiro Unificado';
    if (!currentUser) return;

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

    const canManageFin = currentUser?.role === 'Presidente' || currentUser?.dept === 'Vice-Presidência';

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
}

// Helpers Finanças
window.toggleFinanceTab = (tab) => {
    const isEntrada = tab === 'entradas';
    document.getElementById('form-entradas').style.display = isEntrada ? 'block' : 'none';
    document.getElementById('form-saidas').style.display = isEntrada ? 'none' : 'block';
    
    document.getElementById('tab-entradas').style.borderColor = isEntrada ? '#10b981' : 'transparent';
    document.getElementById('tab-entradas').style.color = isEntrada ? '#10b981' : '#9ca3af';
    document.getElementById('tab-saidas').style.borderColor = !isEntrada ? '#ef4444' : 'transparent';
    document.getElementById('tab-saidas').style.color = !isEntrada ? '#ef4444' : '#9ca3af';
}

window.handleFinanceSubmit = async (type) => {
    const isIncome = type === 'Receita';
    const prefix = isIncome ? 't' : 'g';
    const description = document.getElementById(`${prefix}-desc`).value;
    const amount = Number(document.getElementById(`${prefix}-amount`).value);
    const category = document.getElementById(`${prefix}-cat`).value || 'Geral';
    const date = document.getElementById(`${prefix}-date`).value || new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('transactions').insert([{ type, description, amount, date, category, created_by: currentUser.uid }]);

    if (error) {
        alert("Erro ao registrar: " + error.message);
    } else {
        alert(`${type} registrada com sucesso!`);
        renderFinancas(document.getElementById('dashboard-content'));
    }
}

// Charts Support
window.renderDashboardCharts = (txs) => {
    // 1. Chart Evolução (Receita vs Despesa)
    const ctxFin = document.getElementById('financialChart').getContext('2d');
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

    // 2. Chart Pizza (Expense Categories)
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
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
}

// Report Support
window.openReportModal = () => {
    document.getElementById('report-notes-input').value = '';
    document.getElementById('report-modal-overlay').style.display = 'flex';
}

window.closeReportModal = () => {
    document.getElementById('report-modal-overlay').style.display = 'none';
}

window.confirmReport = () => {
    const notes = document.getElementById('report-notes-input').value;
    window.closeReportModal();
    window.imprimirRelatorio(notes);
}

window.imprimirRelatorio = (notes) => {
    const data = window.currentDashboardData;
    if (!data) return alert("Erro ao carregar dados do relatório");

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
}

async function renderComercial(container) {
    document.getElementById('page-title').innerText = 'Comercial / CRM';
    if (!currentUser) return;

    const leads = [];

    container.innerHTML = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 2rem;">
            <button onclick="window.openLeadModal()" style="width: auto; background: #10b981; border: none; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.5rem;"><span style="font-size: 1.2rem;">➕</span> Cadastrar Novo Lead</button>
        </div>

        <div class="card">
            <h3>Pipeline de Leads</h3>
            <table>
                <thead>
                    <tr><th>Cliente/Empresa</th><th>Contato</th><th>Dor/Necessidade</th><th>Probabilidade</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${leads.length > 0 ? leads.map(l => `
                        <tr>
                            <td><b>${l.name}</b></td>
                            <td>${l.contact}</td>
                            <td>${l.pain}</td>
                            <td><span style="padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; background: ${l.probability === 'Alta' ? 'rgba(16, 185, 129, 0.2)' : l.probability === 'Média' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${l.probability === 'Alta' ? '#10b981' : l.probability === 'Média' ? '#f59e0b' : '#ef4444'};">${l.probability}</span></td>
                            <td><span style="padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; background: rgba(255,255,255,0.05); color: var(--text-main);">${l.status}</span></td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Nenhum lead cadastrado</td></tr>'}
                </tbody>
            </table>
        </div>

        <!-- Modal Cadastro Lead -->
        <div id="lead-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 999; justify-content: center; align-items: center;">
            <div class="card" style="width: 400px; max-width: 90%; background: #111; padding: 2rem;">
                <h3>📋 Novo Lead</h3>
                <form id="lead-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                    <div><label>Empresa/Cliente</label><input type="text" id="l-name" required></div>
                    <div><label>Contato</label><input type="text" id="l-contact" required></div>
                    <div><label>Dor / Necessidade</label><input type="text" id="l-pain" required></div>
                    <div><label>Probabilidade</label>
                        <select id="l-prob" style="width: 100%;">
                            <option value="Alta">Alta</option>
                            <option value="Média">Média</option>
                            <option value="Baixa">Baixa</option>
                        </select>
                    </div>
                    <button type="submit">Cadastrar</button>
                    <button type="button" onclick="window.closeLeadModal()" style="background: transparent; border: 1px solid #333; color: #9ca3af; margin-top: 0.5rem;">Cancelar</button>
                </form>
            </div>
        </div>
    `;

    window.openLeadModal = () => { document.getElementById('lead-modal').style.display = 'flex'; }
    window.closeLeadModal = () => { document.getElementById('lead-modal').style.display = 'none'; }
    
    document.getElementById('lead-form').addEventListener('submit', (e) => {
        e.preventDefault();
        alert("Lead cadastrado com sucesso! (Simulado)");
        window.closeLeadModal();
    });
}
