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
        case 'economia': await renderEconomia(container); break;
        case 'gastos': await renderGastos(container); break;
        default: container.innerHTML = '<div class="card">Página não encontrada</div>';
    }
}

// --- PAGES ---

async function renderHome(container) {
    document.getElementById('page-title').innerText = 'Dashboard Principal';
    if (!currentUser) return;
    
    if (currentUser.role === 'Presidente') {
        container.innerHTML = `<div class="card"><h3>🏛️ Visão da Presidência</h3><p>Bem-vindo, Chefe.</p></div>`;
    } else if (currentUser.role === 'Diretor') {
        container.innerHTML = `<div class="card"><h3>📈 Visão da Diretoria (${currentUser.dept})</h3><p>Gerencie sua equipe.</p></div>`;
    } else {
        container.innerHTML = `<div class="card"><h3>👋 Bem-vindo ao Sistema</h3><p>Acompanhe suas tarefas.</p></div>`;
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
    document.getElementById('page-title').innerText = 'Projetos';
    
    const { data: projects, error } = await supabase
        .from('projects')
        .select(`
            *,
            users ( name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<div class="card">Erro ao carregar projetos.</div>';
        console.error(error);
        return;
    }

    const canManageProjetos = currentUser?.role === 'Presidente' || currentUser?.dept === 'Projetos';

    container.innerHTML = `
        ${canManageProjetos ? `
        <div class="card" style="margin-bottom: 2rem;">
            <h3>🚀 Novo Projeto</h3>
            <form id="project-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                <input type="text" id="p-name" placeholder="Nome do Projeto" required style="width: 100%;">
                <textarea id="p-desc" placeholder="Descrição / Escopo" style="width: 100%; height: 100px; padding: 1rem; background: rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px; resize: vertical;"></textarea>
                <select id="p-status" style="width: 100%;">
                    <option value="Planejamento">Planejamento</option>
                    <option value="Em Execução">Em Execução</option>
                    <option value="Concluído">Concluído</option>
                </select>
                <button type="submit">➕ Criar Projeto</button>
            </form>
        </div>
        ` : ''}

        <div class="card">
            <h3>Lista de Projetos</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
                ${projects?.map(p => `
                    <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; justify-content: space-between; min-height: 200px; position: relative;">
                        <!-- Topo do Card -->
                        <div>
                            <span style="position: absolute; top: 1rem; right: 1rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; background: ${p.status === 'Concluído' ? 'rgba(16, 185, 129, 0.2)' : p.status === 'Em Execução' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(107, 114, 128, 0.2)'}; color: ${p.status === 'Concluído' ? '#10b981' : p.status === 'Em Execução' ? '#3b82f6' : '#9ca3af'}; border: 1px solid ${p.status === 'Concluído' ? 'rgba(16, 185, 129, 0.3)' : p.status === 'Em Execução' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(107, 114, 128, 0.3)'};">${p.status}</span>
                            <h4 style="margin-bottom: 0.5rem; color: #fff; font-size: 1.1rem; padding-right: 6rem;">${p.name}</h4>
                            <p style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 1.5rem; line-height: 1.5;">${p.description || 'Sem descrição.'}</p>
                        </div>

                        <!-- Rodapé do Card -->
                        <div style="margin-top: auto;">
                            <hr style="border-color: rgba(255,255,255,0.05); margin-bottom: 0.8rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                                <small style="color: #6b7280;">Por: <b style="color: #e5e7eb;">${p.users?.name || 'Desconhecido'}</b></small>
                                ${canManageProjetos ? `
                                <button onclick="window.deleteProject('${p.id}')" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; cursor: pointer; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.8rem; display: flex; align-items: center; gap: 0.3rem; transition: all 0.2s;" title="Excluir">🗑️ <span style="font-weight: 500;">Excluir</span></button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('') || '<p>Nenhum projeto cadastrado.</p>'}
            </div>
        </div>
    `;

    document.getElementById('project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('p-name').value;
        const description = document.getElementById('p-desc').value;
        const status = document.getElementById('p-status').value;

        const { error: insertError } = await supabase
            .from('projects')
            .insert([{ name, description, status, created_by: currentUser.uid }]);

        if (insertError) {
            alert("Erro ao criar projeto: " + insertError.message);
        } else {
            alert("Projeto criado com sucesso!");
            
            // Disparar Notificação por Email via EmailJS
            sendEmailNotification({
                titulo_notificacao: 'Novo Projeto Criado',
                subtitulo: '🚀 Projeto: ' + name,
                mensagem_corpo: 'Um novo projeto foi adicionado ao sistema por ' + (currentUser?.name || 'Membro') + '.',
                detalhes: `• Nome: ${name}\n• Status: ${status}\n• Descrição: ${description || 'Sem descrição.'}`
            });

            renderProjetos(container); // Recarrega
        }
    });
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

async function renderEconomia(container) {
    document.getElementById('page-title').innerText = 'Painel Financeiro';

    // Busca Transações
    const { data: txs, error } = await supabase
        .from('transactions')
        .select(`*, users(name)`)
        .order('date', { ascending: false });

    if (error) {
        container.innerHTML = '<div class="card">Erro ao carregar finanças.</div>';
        return;
    }

    // Cálculos
    const receita = txs?.filter(t => t.type === 'Receita').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const despesa = txs?.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const saldo = receita - despesa;

    const canManageFin = currentUser?.role === 'Presidente' || currentUser?.dept === 'Vice-Presidência';

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div class="card" style="border-left: 4px solid #10b981;">
                <small>💰 Saldo Atual</small>
                <h2 style="font-size: 2rem; color: ${saldo >= 0 ? '#10b981' : '#ef4444'};">R$ ${saldo.toFixed(2)}</h2>
            </div>
            <div class="card" style="border-left: 4px solid #10b981;">
                <small>📈 Total Receitas</small>
                <h3 style="color: #10b981;">+ R$ ${receita.toFixed(2)}</h3>
            </div>
            <div class="card" style="border-left: 4px solid #ef4444;">
                <small>📉 Total Despesas</small>
                <h3 style="color: #ef4444;">- R$ ${despesa.toFixed(2)}</h3>
            </div>
        </div>

        ${canManageFin ? `
        <div class="card" style="margin-bottom: 2rem;">
            <h3>➕ Lançar Receita/Entrada</h3>
            <form id="income-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                <div style="display: flex; gap: 1rem;">
                    <input type="text" id="t-desc" placeholder="Descrição (Ex: Fechamento Projeto X)" required style="flex: 2;">
                    <input type="number" id="t-amount" placeholder="Valor (R$)" step="0.01" min="0.01" required style="flex: 1;">
                </div>
                <div style="display: flex; gap: 1rem;">
                    <input type="date" id="t-date" style="flex: 1;">
                    <input type="text" id="t-cat" placeholder="Categoria (Ex: Projetos, Doação)" style="flex: 1;">
                </div>
                <button type="submit" style="background: #10b981;">✅ Registrar Receita</button>
            </form>
        </div>
        ` : ''}

        <div class="card">
            <h3>Historico de Transações</h3>
            <div style="overflow-x: auto; margin-top: 1rem;">
                <table>
                    <thead>
                        <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Autor</th></tr>
                    </thead>
                    <tbody>
                        ${txs?.map(t => `
                            <tr>
                                <td data-label="Data">${new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                <td data-label="Tipo" style="color: ${t.type === 'Receita' ? '#10b981' : '#ef4444'}; font-weight: bold;">${t.type}</td>
                                <td data-label="Descrição">${t.description}</td>
                                <td data-label="Valor">R$ ${Number(t.amount).toFixed(2)}</td>
                                <td data-label="Autor">${t.users?.name || '-'}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5">Sem movimentações.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('income-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const description = document.getElementById('t-desc').value;
        const amount = Number(document.getElementById('t-amount').value);
        const date = document.getElementById('t-date').value || new Date().toISOString().split('T')[0];
        const category = document.getElementById('t-cat').value || 'Geral';

        const { error: insertError } = await supabase
            .from('transactions')
            .insert([{ type: 'Receita', description, amount, date, category, created_by: currentUser.uid }]);

        if (insertError) {
            alert("Erro: " + insertError.message);
        } else {
            alert("Receita registrada!");
            
            // Disparar Notificação por Email via EmailJS
            sendEmailNotification({
                titulo_notificacao: 'Nova Entrada Financeira',
                subtitulo: '💰 Receita Registrada',
                mensagem_corpo: 'Uma nova entrada financeira foi lançada pelo painel.',
                detalhes: `• Tipo: Receita\n• Descrição: ${description}\n• Valor: R$ ${Number(amount).toFixed(2)}\n• Categoria: ${category || 'Geral'}`
            });

            renderEconomia(container);
        }
    });
}

async function renderGastos(container) {
    document.getElementById('page-title').innerText = 'Controle de Gastos';

    const { data: txs, error } = await supabase
        .from('transactions')
        .select(`*, users(name)`)
        .eq('type', 'Despesa')
        .order('date', { ascending: false });

    if (error) {
        container.innerHTML = '<div class="card">Erro ao carregar despesas.</div>';
        return;
    }

    const canManageFin = currentUser?.role === 'Presidente' || currentUser?.dept === 'Vice-Presidência';

    container.innerHTML = `
         ${canManageFin ? `
         <div class="card" style="margin-bottom: 2rem;">
            <h3>💸 Registrar Novo Gasto/Despesa</h3>
            <form id="expense-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                <div style="display: flex; gap: 1rem;">
                    <input type="text" id="g-desc" placeholder="Descrição (Ex: Servidor AWS)" required style="flex: 2;">
                    <input type="number" id="g-amount" placeholder="Valor (R$)" step="0.01" min="0.01" required style="flex: 1;">
                </div>
                <div style="display: flex; gap: 1rem;">
                    <input type="date" id="g-date" style="flex: 1;">
                    <input type="text" id="g-cat" placeholder="Categoria (Ex: Infra, Coffee Break)" style="flex: 1;">
                </div>
                <button type="submit" style="background: #ef4444;">🚨 Lançar Gasto</button>
            </form>
        </div>
        ` : ''}

        <div class="card">
            <h3>Lista de Despesas</h3>
             <div style="overflow-x: auto; margin-top: 1rem;">
                <table>
                    <thead>
                        <tr><th>Data</th><th>Fluxo</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Por</th></tr>
                    </thead>
                    <tbody>
                        ${txs?.map(t => `
                            <tr>
                                <td data-label="Data">${new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                <td data-label="Fluxo" style="color: #ef4444; font-weight: bold;">Despesa</td>
                                <td data-label="Descrição">${t.description}</td>
                                <td data-label="Categoria"><span style="background: rgba(239, 68, 68, 0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${t.category}</span></td>
                                <td data-label="Valor" style="color: #ef4444;">- R$ ${Number(t.amount).toFixed(2)}</td>
                                <td data-label="Por">${t.users?.name || '-'}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6">Sem despesas registradas.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const description = document.getElementById('g-desc').value;
        const amount = Number(document.getElementById('g-amount').value);
        const date = document.getElementById('g-date').value || new Date().toISOString().split('T')[0];
        const category = document.getElementById('g-cat').value || 'Geral';

        const { error: insertError } = await supabase
            .from('transactions')
            .insert([{ type: 'Despesa', description, amount, date, category, created_by: currentUser.uid }]);

        if (insertError) {
            alert("Erro: " + insertError.message);
        } else {
            alert("Despesa cadastrada!");
            
            // Disparar Notificação por Email via EmailJS
            sendEmailNotification({
                titulo_notificacao: 'Nova Saída Financeira',
                subtitulo: '💸 Despesa Registrada',
                mensagem_corpo: 'Uma nova saída/gasto foi lançado no financeiro.',
                detalhes: `• Tipo: Despesa\n• Descrição: ${description}\n• Valor: - R$ ${Number(amount).toFixed(2)}\n• Categoria: ${category || 'Geral'}`
            });

            renderGastos(container);
        }
    });
}
