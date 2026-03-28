import './modules/comercial.js';
import './modules/financas.js';
import './modules/projetos.js';
import './modules/calendario.js';
import { supabase } from './supabase-config.js';

// --- UX UTILITIES ---
window.showToast = (msg, type='info') => { 
    const container = document.getElementById('toast-container'); 
    if(!container) return; 
    const t = document.createElement('div'); 
    t.className = 'toast toast-' + type; 
    t.innerHTML = msg; 
    container.appendChild(t); 
    setTimeout(() => t.classList.add('show'), 10); 
    setTimeout(() => { 
        t.classList.remove('show'); 
        setTimeout(() => t.remove(), 400); 
    }, 4000); 
};
window.renderSkeleton = (type) => { 
    if(type === 'cards') return '<div style="display:flex;gap:1rem;"><div class="skeleton skeleton-card" style="width:300px;"></div><div class="skeleton skeleton-card" style="width:300px;"></div></div>'; 
    return '<div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>'; 
};


// --- API DE ANIMAÇÃO DE XP ---
window.playXpAnimation = (gainedXp) => {
    const floater = document.createElement('div');
    floater.innerText = `+${gainedXp} XP!`;
    floater.style.position = 'fixed';
    floater.style.top = '60px'; 
    floater.style.right = '40px'; // Direita (perto do widget de perfil)
    floater.style.color = '#10b981'; // Verde bonito
    floater.style.fontWeight = 'bold';
    floater.style.fontSize = '1.3rem';
    floater.style.zIndex = '99999';
    floater.style.pointerEvents = 'none';
    floater.style.textShadow = '0px 2px 10px rgba(0,0,0,0.8)';
    floater.style.transition = 'all 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
    floater.style.transform = 'translateY(0) scale(1)';
    floater.style.opacity = '1';
    
    document.body.appendChild(floater);
    
    // Inicia a animação (subir e desaparecer)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            floater.style.transform = 'translateY(-50px) scale(1.2)';
            floater.style.opacity = '0';
        });
    });
    
    // Remove o nó depois de concluída a transição
    setTimeout(() => { if(floater.parentNode) floater.parentNode.removeChild(floater); }, 1500);
};

// --- NOTIFICAÇÕES (EmailJS) ---
async function sendEmailNotification(subjectParams, targetEmail = null) {
    try {
        let emails = [];
        if (targetEmail) {
            emails = [targetEmail];
        } else {
            const { data: users, error } = await supabase.from('users').select('email');
            if (error) throw error;
            emails = users.map(u => u.email).filter(Boolean);
        }
        
        for (const email of emails) {
            const htmlMessage = `
            <div style="font-family: sans-serif; background: #0a0a0a; color: #fff; padding: 30px; border-radius: 8px; border: 1px solid #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-top: 0;">🛎️ Optimus JR - Notificação</h2>
                <h3 style="color: #60a5fa; margin-top: 20px;">${subjectParams.subject}</h3>
                <p style="font-size: 16px; line-height: 1.6; color: #e5e7eb;">${subjectParams.message}</p>
                <br>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://optimusjr.com.br" style="background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">Acessar Sistema</a>
                </div>
                <hr style="border: none; border-top: 1px solid #333; margin: 30px 0 20px 0;">
                <p style="font-size: 11px; color: #6b7280; text-align: center;">Esta é uma mensagem automática gerada pelo seu Optimus ERP.</p>
            </div>
            `;

            emailjs.send('service_2blmih4', 'template_7j2d1ml', {
                to_email: email,
                to_name: currentUser ? currentUser.name : 'Membro',
                subtitulo: subjectParams.subject,
                mensagem_corpo: subjectParams.message,
                detalhes: "Faça login no sistema Optimus JR para tomar as próximas ações."
            }).catch(console.error);
        }
    } catch (err) {
        console.error("Erro ao carregar lista de emails:", err);
    }
}

// --- SISTEMA DE NOTIFICAÇÕES (BELL) ---
window.triggerNotification = async (targetUserId, title, message) => {
    try {
        await supabase.from('notifications').insert([{
            user_id: targetUserId,
            title,
            message,
            is_read: false
        }]);
        if (currentUser && currentUser.uid === targetUserId) {
            window.fetchNotifications();
        }
} catch(e) { console.error("Notificação Insert Err:", e); }
}

window.notifyDirectors = async (title, message) => {
    if (!currentUser) return;
    const { data: users } = await supabase.from('users').select('uid, role, dept');
    if(users) {
        const toNotify = users.filter(u => u.role === 'Presidente' || (u.role === 'Diretor' && u.dept === currentUser.dept));
        toNotify.forEach(d => window.triggerNotification(d.uid, title, message));
    }
}

window.notifyGlobalDirectors = async (title, message) => {
    const { data: users } = await supabase.from('users').select('uid').in('role', ['Diretor', 'Presidente']);
    if(users) users.forEach(u => window.triggerNotification(u.uid, title, message));
}

window.fetchNotifications = async () => {
    if(!currentUser) return;
    const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.uid)
        .order('created_at', { ascending: false })
        .limit(15);
        
    if(error) return;
    
    const unreadCount = notifs.filter(n => !n.is_read).length;
    const badge = document.getElementById('notification-badge');
    if(badge) {
        badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
        if(unreadCount > 0) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    }
    
    const listHtml = document.getElementById('notification-list');
    if(!listHtml) return;
    
    if(notifs.length === 0) {
        listHtml.innerHTML = '<li style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Sua caixa de notificações está vazia.</li>';
        return;
    }
    
    listHtml.innerHTML = notifs.map(n => `
        <li class="notification-item ${!n.is_read ? 'unread' : ''}" onclick="window.markAsRead('${n.id}', event)">
            <h4>${n.title}</h4>
            <p>${n.message}</p>
            <small>${new Date(n.created_at).toLocaleString('pt-br')}</small>
        </li>
    `).join('');
}

window.toggleNotifications = (e) => {
    e.stopPropagation();
    const dd = document.getElementById('notification-dropdown');
    if(dd) {
        dd.classList.toggle('active');
        if(dd.classList.contains('active')) window.fetchNotifications();
    }
}

window.markAsRead = async (notifId, e) => {
    if(e) e.stopPropagation();
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    window.fetchNotifications();
}

window.markAllAsRead = async (e) => {
    if(e) e.stopPropagation();
    if(!currentUser) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.uid).eq('is_read', false);
    window.fetchNotifications();
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', () => {
    const dd = document.getElementById('notification-dropdown');
    if(dd) dd.classList.remove('active');
});

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
        window.currentUser = userSnap;
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
            xp: 0
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
        if (!currentUser) checkUserInPostgres(session.user);
    } else {
        views.dashboard.classList.add('hidden');
        views.auth.classList.remove('hidden');
        currentUser = null;
        window.currentUser = null;
    }
});

// --- NAVIGATION ---

window.updateHeaderWidget = () => {
    if(!currentUser) return;
    const avatar = currentUser.photoURL || 'https://via.placeholder.com/40';
    const widget = document.getElementById('user-profile-widget');
    if(widget) {
        widget.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem;">
                <div style="text-align: right;">
                    <span style="display:block; font-weight:bold;">${currentUser.name || 'Carregando...'}</span>
                    <small style="color: var(--text-muted)">${currentUser.role || ''} • ${currentUser.dept || ''} <span style="margin-left: 0.5rem; color: #f59e0b;">⭐ ${currentUser.xp || 0} XP</span></small>
                </div>
                <img src="${avatar}" style="width:40px; height:40px; border-radius:50%; border:2px solid var(--primary); object-fit: cover;">
            </div>
        `;
    }
};

function showDashboard() {
    views.auth.classList.add('hidden');
    views.dashboard.classList.remove('hidden');
    
    // Header Info
    window.updateHeaderWidget();

    window.fetchNotifications();

    const navDir = document.getElementById('nav-diretoria');
    const navDemandas = document.getElementById('nav-demandas');
    
    if (currentUser.role === 'Ex-Júnior') {
        if (navDemandas) navDemandas.style.display = 'none';
        if (navDir) navDir.style.display = 'none';
    } else {
        if (navDemandas) navDemandas.style.display = 'block';
        if (currentUser.role === 'Diretor' || currentUser.role === 'Presidente') {
            if (navDir) navDir.style.display = 'block';
        } else {
            if (navDir) navDir.style.display = 'none';
        }
    }

    if (!currentUser.role || currentUser.role === 'Membro' && currentUser.dept === 'Geral') {
        window.showToast("👋 Bem-vindo! Por favor, atualize o seu Cargo e Departamento no seu perfil.", 'success');
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
        window.showToast("Erro ao excluir: " + error.message, 'error');
    } else {
        window.showToast("Projeto excluído!", 'success');
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

    try {
        switch(currentPage) {
            case 'home': await renderHome(container); break;
            case 'perfil': await renderProfile(container); break;
            case 'membros': await renderMembros(container); break;
            case 'projetos': await renderProjetos(container); break;
            case 'historia': renderHistoria(container); break;
            case 'financas': await renderFinancas(container); break;
            case 'comercial': await renderComercial(container); break;
            case 'calendario': await renderCalendario(container); break;
            case 'feedbacks': await renderFeedbacks(container); break;
            case 'diretoria': await renderDiretoria(container); break;
            case 'demandas': await renderMinhasDemandas(container); break;
            default: container.innerHTML = '<div class="card">Página não encontrada</div>';
        }
    } catch (err) {
        console.error("Erro ao carregar conteúdo:", err);
        container.innerHTML = `<div class="card" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.05);">
            <h3 style="color: #ef4444;">⚠️ Erro ao carregar página</h3>
            <p style="color: var(--text-muted); margin-top: 1rem;">Ocorreu um erro técnico ao renderizar esta seção.</p>
            <pre style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-top: 1rem; font-size: 0.8rem; overflow-x: auto;">${err.message}</pre>
            <button onclick="location.reload()" style="margin-top: 1.5rem; width: auto; background: #3b82f6;">Recarregar Sistema</button>
        </div>`;
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
        const topPerformersXP = [...members].sort((a,b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);

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

        const META_FATURAMENTO = 15000;
        const META_PROJETOS = 10;
        const percFaturamento = Math.min(100, (revCurrent / META_FATURAMENTO) * 100);
        const percProjetos = Math.min(100, (doneProjs / META_PROJETOS) * 100);

        container.innerHTML = `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
                <button onclick="window.openReportModal()" style="width: auto; background: #3b82f6; border: none; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.5rem;"><span style="font-size: 1.2rem;">📊</span> Gerar Relatório de Desempenho</button>
            </div>

            <!-- OKRs / Metas -->
            <div class="okrs-container">
                <div class="okr-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #fff;">🎯 Faturamento Semestral</span>
                        <small style="color: #6b7280; font-weight: bold;">${percFaturamento.toFixed(1)}%</small>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar-fill" style="width: ${percFaturamento}%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                        <span>Alcançado: R$ ${revCurrent.toFixed(2)}</span>
                        <span>Meta: R$ ${META_FATURAMENTO.toFixed(2)}</span>
                    </div>
                </div>
                <div class="okr-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #fff;">🚀 Projetos Fechados</span>
                        <small style="color: #6b7280; font-weight: bold;">${percProjetos.toFixed(1)}%</small>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar-fill" style="width: ${percProjetos}%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                        <span>Alcançado: ${doneProjs}</span>
                        <span>Meta: ${META_PROJETOS}</span>
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
                    <h3>🏆 Top Performers (Gamificação)</h3>
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.8rem;">
                        ${topPerformersXP.map((tp, idx) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="display: flex; align-items: center; gap: 0.8rem;">
                                    <h3 style="color: ${idx===0 ? '#f59e0b' : idx===1 ? '#9ca3af' : idx===2 ? '#b45309' : '#fff'}; margin: 0; min-width: 20px;">#${idx+1}</h3>
                                    <img src="${tp.photoURL || 'https://via.placeholder.com/30'}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                                    <span style="font-size: 0.9rem;">${tp.name}</span>
                                </div>
                                <span style="color: #f59e0b; font-weight: bold; font-size: 0.85rem;">⭐ ${tp.xp || 0} XP</span>
                            </div>
                        `).join('')}
                    </div>
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
                <h2 style="margin-top: 1rem;">${currentUser.name} <span style="font-size: 1rem; color: #f59e0b; vertical-align: middle; margin-left: 0.5rem;">⭐ ${currentUser.xp || 0} XP</span></h2>
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
                    <option value="Ex-Júnior" ${currentUser.role === 'Ex-Júnior' ? 'selected' : ''}>Ex-Júnior</option>
                </select>
            </div>

            <div class="form-group">
                <label>📂 Departamento</label>
                <select id="edit-dept" style="width: 100%;">
                    <option value="Projetos" ${currentUser.dept === 'Projetos' ? 'selected' : ''}>Projetos</option>
                    <option value="Marketing" ${currentUser.dept === 'Marketing' ? 'selected' : ''}>Marketing</option>
                    <option value="Comercial" ${currentUser.dept === 'Comercial' ? 'selected' : ''}>Comercial</option>
                    <option value="Gestão de Pessoas" ${currentUser.dept === 'Gestão de Pessoas' ? 'selected' : ''}>Gestão de Pessoas</option>
                    <option value="Vice-Presidência" ${currentUser.dept === 'Vice-Presidência' ? 'selected' : ''}>Vice-Presidência</option>
                    <option value="Presidência" ${currentUser.dept === 'Presidência' ? 'selected' : ''}>Presidência</option>
                </select>
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
        
        window.showToast("Foto atualizada!", 'success');
    } catch (err) {
        console.error(err);
        window.showToast("Erro ao enviar foto: " + err.message, 'error');
    }
}

window.saveProfile = async () => {
    const bio = document.getElementById('edit-bio').value;
    const role = document.getElementById('edit-role').value;
    const dept = document.getElementById('edit-dept').value;
    
    // --- GUARDA DE PERMISSÕES ---
    const { data: allUsers } = await supabase.from('users').select('uid, role, dept');
    
    const presidents = allUsers?.filter(u => u.role === 'Presidente' && u.uid !== currentUser.uid) || [];
    if (role === 'Presidente' && presidents.length > 0) {
        window.showToast("🚨 Negado: Só pode haver um Presidente cadastrado!", 'error');
        return;
    }
    
    const directors = allUsers?.filter(u => u.dept === dept && u.role === 'Diretor' && u.uid !== currentUser.uid) || [];
    if (role === 'Diretor' && directors.length > 0) {
         window.showToast(`🚨 Negado: Já existe um Diretor no departamento ${dept}!`, 'error');
         return;
    }
    // ----------------------------
    
    const { error: updateError } = await supabase
        .from('users')
        .update({ bio, role, dept })
        .eq('uid', currentUser.uid);
        
    if (updateError) {
        window.showToast("Erro ao salvar o perfil!", 'error');
        console.error(updateError);
        return;
    }
        
    currentUser.bio = bio;
    currentUser.role = role;
    currentUser.dept = dept;
    
    window.showToast("Perfil Atualizado com sucesso!", 'success');
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

    const canManageMembers = currentUser?.role === 'Presidente' || currentUser?.dept === 'Gestão de Pessoas';

    container.innerHTML = `
        <div class="card">
            <h3>Nossa Equipe</h3>
            <div style="overflow-x: auto; width: 100%;">
            <table>
                <thead>
                    <tr>
                        <th>Membro</th>
                        <th>Cargo</th>
                        <th>Depto</th>
                        ${canManageMembers ? '<th>Ações</th>' : ''}
                    </tr>
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
                            ${canManageMembers ? `<td data-label="Ações"><button onclick="window.deleteMember('${m.uid}')" style="background:transparent; color:#ef4444; padding:0; width:auto; font-size:1.2rem;" title="Remover Membro">🗑️</button></td>` : ''}
                        </tr>
                    `).join('') || `<tr><td colspan="${canManageMembers ? '4' : '3'}">Nenhum membro encontrado.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
}

window.deleteMember = async (uid) => {
    if (!await customConfirm("Remover Membro", "Tem certeza que deseja remover permanentemente este membro da EJ? O acesso dele será revogado e seu perfil apagado.")) return;
    
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('uid', uid);
        
    if (error) {
        window.showToast("Erro ao remover membro: " + error.message, 'error');
    } else {
        window.showToast("Membro removido da EJ!", 'success');
        if (currentPage === 'membros') {
            renderMembros(document.getElementById('dashboard-content'));
        }
    }
}

// --- PROJETOS MODULE EXPORTED ---


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
            <div class="card" style="border-top: 44px solid #eab308;">
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

// --- FINANÇAS MODULE EXPORTED ---


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

async function renderComercial(container) {
    document.getElementById('page-title').innerText = 'Comercial / CRM & Funil';
    if (!currentUser) return;

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
            
            ${currentUser.role !== 'Ex-Júnior' ? `<button onclick="window.openLeadModal()" style="margin-left: auto; width: auto; background: #10b981; border: none; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;"><span style="font-size: 1rem;">➕</span> Criar Lead / Oportunidade</button>` : `<div style="margin-left:auto;"></div>`}
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
            name, contact, pain, probability, status, funnel_phase, funnel_data, created_by: currentUser.uid
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
    window.allowLeadDrop = (e) => { if (currentUser.role === 'Ex-Júnior') return; e.preventDefault(); }
    window.dragLead = (e, leadId) => { if (currentUser.role === 'Ex-Júnior') return; e.dataTransfer.setData("text/plain", leadId); }
    window.dropLead = async (e, newPhase) => {
        if (currentUser.role === 'Ex-Júnior') return;
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
        if (btnSave) btnSave.style.display = currentUser.role === 'Ex-Júnior' ? 'none' : 'block';
        
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

// --- CALENDÁRIO MODULE EXPORTED ---


// --- FEEDBACKS & IDEIAS ---
async function renderFeedbacks(container) {
    document.getElementById('page-title').innerText = 'Ideias & Feedbacks';
    if (!currentUser) return;

    container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted)">💡 Carregando feedbacks e ideias...</div>`;

    let items = [];
    let loadError = false;

    try {
        const { data, error } = await supabase
            .from('feedbacks_ideias')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        items = data || [];
    } catch (err) {
        console.error("Erro ao carregar feedbacks_ideias:", err);
        loadError = true;
    }

    container.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 2rem; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap;">
            <div style="background: rgba(245, 158, 11, 0.2); padding: 0.6rem; border-radius: 8px;"><span style="font-size: 1.5rem;">💡</span></div>
            <div>
                <h4 style="color: #fff;">Caixa de Ideias & Feedbacks</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Espaço para sugestões, melhorias e feedbacks (pode ser anônimo).</p>
            </div>
            
            ${currentUser.role !== 'Ex-Júnior' ? `<button onclick="window.openFeedbackModal()" style="margin-left: auto; background: #3b82f6; border: none; font-weight: bold; padding: 0.6rem 1.2rem; font-size: 0.85rem;">➕ Enviar Nota</button>` : ''}
        </div>

        ${loadError ? `<div class="card" style="margin-bottom: 2rem; border-color: #ef4444; background: rgba(239, 68, 68, 0.05);">
            <p style="color: #ef4444; font-weight: bold;">⚠️ Tabela 'feedbacks_ideias' não encontrada no Supabase!</p>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">Por favor, execute o arquivo <b><code>feedback_setup.sql</code></b> no seu painel para ativar esta função.</p>
        </div>` : ''}

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
            ${items.length === 0 ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma ideia ou feedback registrado ainda. Seja o primeiro!</div>` : ''}
            ${items.map(item => {
                const isIdea = item.type === 'ideia';
                const color = isIdea ? '#f59e0b' : '#3b82f6';
                const label = isIdea ? '💡 Ideia' : '🗣️ Feedback';
                
                return `
                    <div class="card" style="position: relative; border-color: rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="background: rgba(${isIdea ? '245, 158, 11' : '59, 130, 246'}, 0.1); color: ${color}; font-size: 0.75rem; font-weight: bold; padding: 0.3rem 0.6rem; border-radius: 6px;">${label}</span>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p style="flex: 1; font-size: 0.9rem; color: #fff; white-space: pre-wrap;">${item.content}</p>
                        <div style="border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.8rem; font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                            <span>Por: <b>${item.author || 'Anônimo'}</b></span>
                            ${!loadError ? `<button onclick="window.deletarFeedback('${item.id}')" style="background: transparent; color: #ef4444; padding: 2px 5px; border: none; font-size: 0.7rem; width: auto;" title="Deletar">Remover</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Modal Cadastro Feedback -->
        <div id="fb-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 999; justify-content: center; align-items: center;">
            <div class="card" style="width: 450px; max-width: 90%; background: #111; padding: 2rem;">
                <h3>📋 Enviar Nova Nota</h3>
                <form id="fb-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                    <div>
                        <label>Tipo</label>
                        <select id="f-type" style="width: 100%;" required>
                            <option value="ideia">💡 Ideia / Sugestão</option>
                            <option value="feedback">🗣️ Feedback / Crítica</option>
                        </select>
                    </div>
                    <div>
                        <label>Conteúdo</label>
                        <textarea id="f-content" required style="width:100%; height: 100px; padding: 0.8rem; background: rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px;" placeholder="Escreva aqui seu pensamento..."></textarea>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="f-anon" style="width: auto;">
                        <label for="f-anon" style="font-size: 0.85rem; cursor: pointer;">Postar anonimamente</label>
                    </div>
                    <button type="submit">Enviar</button>
                    <button type="button" onclick="window.closeFeedbackModal()" style="background: transparent; border: 1px solid #333; color: #9ca3af; margin-top: 0.5rem;">Cancelar</button>
                </form>
            </div>
        </div>
    `;

    // Metodos do modal
    window.openFeedbackModal = () => { document.getElementById('fb-modal').style.display = 'flex'; }
    window.closeFeedbackModal = () => { document.getElementById('fb-modal').style.display = 'none'; }

    // Salvar Feedback
    document.getElementById('fb-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('f-type').value;
        const content = document.getElementById('f-content').value;
        const isAnon = document.getElementById('f-anon').checked;
        const author = isAnon ? null : currentUser.name; 

        const { error } = await supabase
            .from('feedbacks_ideias')
            .insert([{ type, content, author }]);

        if (error) {
            window.showToast("Erro ao enviar: " + error.message, 'error');
        } else {
            window.showToast("Enviado com sucesso!", 'success');
            
            // Gamificação: Feedback / Ideia
            if (!isAnon) {
                const gainedXp = type === 'ideia' ? 15 : 10;
                const newXp = (currentUser.xp || 0) + gainedXp;
                const { error: xpErr } = await supabase.from('users').update({ xp: newXp }).eq('uid', currentUser.uid);
                if (!xpErr) {
                    currentUser.xp = newXp;
                    const emoji = type === 'ideia' ? '💡' : '🗣️';
                    const msg = type === 'ideia' ? 'Ideia' : 'Feedback';
                    window.updateHeaderWidget();
                    window.playXpAnimation(gainedXp);
                }
            }
            
            // Notificar todos sobre a nova ideia/feedback
            sendEmailNotification({
                subject: `Nova ${type === 'ideia' ? 'Ideia 💡' : 'Avaliação (Feedback) 🗣️'}`,
                message: `Um novo(a) ${type} foi adicionado(a) no mural do sistema: "${content}". Autor: ${author || 'Anônimo'}`
            });

            window.closeFeedbackModal();
            renderFeedbacks(container); 
        }
    });

    window.deletarFeedback = async (id) => {
        if (!confirm("Excluir esta nota?")) return;
        const { error } = await supabase
            .from('feedbacks_ideias')
            .delete()
            .eq('id', id);

        if (error) window.showToast("Erro ao excluir: " + error.message, 'error');
        else renderFeedbacks(container);
    }
}

async function renderDiretoria(container) {
    document.getElementById('page-title').innerText = 'Minha Diretoria';
    if (!currentUser || (currentUser.role !== 'Diretor' && currentUser.role !== 'Presidente')) {
        container.innerHTML = '<div class="card">Acesso Restrito.</div>';
        return;
    }

    const { data: members, error: mErr } = await supabase.from('users').select('*').eq('dept', currentUser.dept);
    const { data: tasks, error: tErr } = await supabase.from('department_tasks').select('*, users!department_tasks_assigned_to_fkey(name)').eq('department', currentUser.dept).order('created_at', { ascending: false });

    if (mErr || tErr) {
        container.innerHTML = '<div class="card">Erro ao carregar dados da diretoria.</div>';
        console.error(mErr, tErr);
        return;
    }

    const deptTasks = tasks || [];
    const deptMembers = members || [];

    // Calculate metrics
    const pendingTasks = deptTasks.filter(t => t.status !== 'Concluído');
    const doneTasks = deptTasks.filter(t => t.status === 'Concluído');
    
    let avgLeadTime = 0;
    if (doneTasks.length > 0) {
        const totalDays = doneTasks.reduce((acc, t) => {
            if (!t.completed_at) return acc;
            const created = new Date(t.created_at);
            const completed = new Date(t.completed_at);
            const diffTime = Math.abs(completed - created);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return acc + diffDays;
        }, 0);
        avgLeadTime = (totalDays / doneTasks.length).toFixed(1);
    }

    // Workload per member
    const memberStats = deptMembers.map(m => {
        const mTasks = deptTasks.filter(t => t.assigned_to === m.uid);
        const mPending = mTasks.filter(t => t.status !== 'Concluído').length;
        const mDone = mTasks.filter(t => t.status === 'Concluído').length;
        let badge = '';
        let badgeColor = '';
        if (mPending === 0) { badge = 'Ocioso'; badgeColor = '#10b981'; } // Green
        else if (mPending <= 2) { badge = 'Disponível'; badgeColor = '#f59e0b'; } // Yellow
        else { badge = 'Sobrecarragado'; badgeColor = '#ef4444'; } // Red
        return { ...m, mPending, mDone, badge, badgeColor, mTasks };
    });

    // Recognition Wall
    const topPerformers = [...memberStats].sort((a,b) => b.mDone - a.mDone).slice(0, 3);

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div class="card" style="border-left: 4px solid #3b82f6;">
                <small>👥 Total de Membros</small>
                <h2 style="font-size: 1.8rem; color: #3b82f6;">${deptMembers.length}</h2>
            </div>
            <div class="card" style="border-left: 4px solid #f59e0b;">
                <small>📋 Demandas Pendentes / Em Andamento</small>
                <h2 style="font-size: 1.8rem; color: #f59e0b;">${pendingTasks.length}</h2>
            </div>
            <div class="card" style="border-left: 4px solid #10b981;">
                <small>⏱️ Tempo Médio de Entrega</small>
                <h2 style="font-size: 1.8rem; color: #10b981;">${avgLeadTime} dias</h2>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <!-- Workload -->
             <div class="card">
                <h3>⚖️ Carga de Trabalho</h3>
                <div style="margin-top: 1rem;">
                    ${memberStats.map(ms => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <div style="display: flex; align-items: center; gap: 0.8rem;">
                                <img src="${ms.photoURL || 'https://via.placeholder.com/30'}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                                <span style="font-weight: bold; font-size: 0.9rem;">${ms.name}</span>
                            </div>
                            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                                <div>
                                    <span style="font-size: 0.75rem; background: ${ms.badgeColor}20; color: ${ms.badgeColor}; padding: 0.2rem 0.6rem; border-radius: 12px; margin-right: 0.5rem;">${ms.badge} (${ms.mPending} demandas)</span>
                                    <span style="font-size: 0.75rem; color: var(--text-muted);">${ms.mDone} concluídas</span>
                                </div>
                                <button onclick="window.analisarDesempenho('${ms.uid}')" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.3rem 0.8rem; font-size: 0.75rem; color: #60a5fa; border-radius: 6px;">📈 Analisar Desempenho</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Mural -->
             <div class="card" style="border-top: 4px solid #eab308;">
                <h3>🏆 Mural de Reconhecimento</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Líderes de entrega deste mês.</p>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${topPerformers.map((tp, idx) => `
                        <div style="display: flex; align-items: center; gap: 1rem; background: rgba(255,255,255,0.02); padding: 0.8rem; border-radius: 8px;">
                            <h2 style="color: #eab308; margin: 0; min-width: 30px;">#${idx+1}</h2>
                            <img src="${tp.photoURL || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <h4 style="margin: 0;">${tp.name}</h4>
                                <span style="font-size: 0.8rem; color: #10b981;">${tp.mDone} entregas 🎉</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
             </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0;">📌 Quadro de Demandas Internas</h3>
            <button onclick="window.openDemandaModal()" style="width: auto; background: #6366f1; border: none; font-weight: bold; padding: 0.6rem 1.2rem;">➕ Nova Demanda</button>
        </div>

        <div class="card">
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr><th>Demanda</th><th>Responsável</th><th>Status</th><th>Ações</th><th style="text-align: right; width: 60px;">Excluir</th></tr>
                    </thead>
                    <tbody>
                        ${deptTasks.map(t => {
                            let statusColor = '#9ca3af';
                            if(t.status === 'Nem comecei') statusColor = '#ef4444';
                            else if(t.status === 'Em andamento') statusColor = '#3b82f6';
                            else if(t.status === 'Quase concluído') statusColor = '#f59e0b';
                            else if(t.status === 'Concluído') statusColor = '#10b981';
                            
                            let nextBtn = '';
                            if (t.status === 'Nem comecei') {
                                nextBtn = `<button onclick="window.updateDemandaStatus('${t.id}', 'Em andamento')" style="background:transparent; color:#3b82f6; padding:0; width:auto; font-size:0.85rem; border:1px solid #3b82f6; border-radius:4px; padding: 0.2rem 0.5rem; white-space: nowrap;">Iniciar</button>`;
                            } else if (t.status === 'Em andamento') {
                                nextBtn = `<button onclick="window.updateDemandaStatus('${t.id}', 'Quase concluído')" style="background:transparent; color:#f59e0b; padding:0; width:auto; font-size:0.85rem; border:1px solid #f59e0b; border-radius:4px; padding: 0.2rem 0.5rem; white-space: nowrap;">Quase Concluir</button>`;
                            } else if (t.status === 'Quase concluído') {
                                nextBtn = `<button onclick="window.updateDemandaStatus('${t.id}', 'Concluído')" style="background:transparent; color:#10b981; padding:0; width:auto; font-size:0.85rem; border:1px solid #10b981; border-radius:4px; padding: 0.2rem 0.5rem; white-space: nowrap;">Concluir</button>`;
                            }

                            let delBtn = `<button onclick="window.deletarDemanda('${t.id}')" title="Excluir Demanda" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 0.4rem 0.6rem; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">🗑️</button>`;

                            return `
                            <tr>
                                <td><b>${t.title}</b><br><small style="color: var(--text-muted);">${t.description}</small></td>
                                <td>${t.users?.name || 'N/A'}</td>
                                <td><span style="background: ${statusColor}20; color: ${statusColor}; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; white-space: nowrap;">${t.status}</span></td>
                                <td>${nextBtn}</td>
                                <td style="text-align: right;">${delBtn}</td>
                            </tr>
                            `;
                        }).join('') || '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Nenhuma demanda cadastrada.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal Nova Demanda -->
        <div id="demanda-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 999; justify-content: center; align-items: center;">
            <div class="card" style="width: 450px; max-width: 90%; background: #111; padding: 2rem;">
                <h3>➕ Atribuir Nova Demanda</h3>
                <form id="demanda-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                    <div><label>Título da Demanda</label><input type="text" id="d-title" required></div>
                    <div><label>Descrição</label><textarea id="d-desc" style="width:100%; height: 80px; padding:0.8rem; background:rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px;"></textarea></div>
                    <div>
                        <label>Responsável</label>
                        <select id="d-assigned" style="width: 100%;" required>
                            <option value="">Selecione um membro...</option>
                            ${deptMembers.map(m => `<option value="${m.uid}">${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <button type="submit" style="background: #6366f1;">Atribuir Demanda</button>
                    <button type="button" onclick="window.closeDemandaModal()" style="background: transparent; border: 1px solid #333; color: #9ca3af; margin-top: 0.5rem;">Cancelar</button>
                </form>
            </div>
        </div>
    `;

    window.openDemandaModal = () => document.getElementById('demanda-modal').style.display = 'flex';
    window.closeDemandaModal = () => document.getElementById('demanda-modal').style.display = 'none';

    window.deletarDemanda = async (id) => {
        if (!confirm("⚠️ Tem certeza que deseja excluir esta demanda internamente? Esta ação não pode ser desfeita.")) return;
        
        const { error } = await supabase.from('department_tasks').delete().eq('id', id);
        
        if (error) {
            window.showToast("Erro ao excluir demanda (Verifique as políticas RLS no Supabase, 'error'): " + error.message);
        } else {
            renderDiretoria(document.getElementById('dashboard-content'));
        }
    }

    document.getElementById('demanda-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('d-title').value;
        const description = document.getElementById('d-desc').value;
        const assigned_to = document.getElementById('d-assigned').value;

        const { error } = await supabase.from('department_tasks').insert([{
            title, description, assigned_to, department: currentUser.dept, status: 'Nem comecei', created_by: currentUser.uid
        }]);

        if (error) window.showToast("Erro: " + error.message, 'error');
        else {
            window.showToast("Demanda atribuída com sucesso!", 'success');
            
            // Gatilho 1: Notificação Direcionada
            const assignedUser = deptMembers.find(m => m.uid === assigned_to);
             if(assignedUser) {
                  window.triggerNotification(assigned_to, 'Nova Demanda Atribuída', `Você recebeu a demanda: ${title}`);
                  sendEmailNotification({
                      subject: 'Nova Demanda Atribuída',
                      message: `Olá ${assignedUser.name}, uma nova demanda (${title}) foi atribuída a você no OptimusERP.`
                  }, assignedUser.email);
             }

            window.closeDemandaModal();
            renderDiretoria(container);
        }
    });

    window.updateDemandaStatus = async (id, newStatus) => {
        const updateData = { status: newStatus };
        if (newStatus === 'Em andamento') {
            updateData.started_at = new Date().toISOString();
        } else if (newStatus === 'Quase concluído') {
            updateData.almost_done_at = new Date().toISOString();
        } else if (newStatus === 'Concluído') {
            updateData.completed_at = new Date().toISOString();
        }

        const taskRef = deptTasks.find(t => t.id === id);

        if (taskRef && taskRef.status !== newStatus) {
             let xpGained = 0;
             let phaseMsg = "";
             
             if (newStatus === 'Em andamento' && !taskRef.started_at) { xpGained = 10; phaseMsg = 'Em andamento'; }
             else if (newStatus === 'Quase concluído' && !taskRef.almost_done_at) { xpGained = 20; phaseMsg = 'Quase concluído'; }
             else if (newStatus === 'Concluído' && !taskRef.completed_at) { xpGained = 30; phaseMsg = 'Concluída'; }

             if(xpGained > 0) {
                 const { data: assignData } = await supabase.from('users').select('xp').eq('uid', taskRef.assigned_to).single();
                 if(assignData) {
                      const newXp = (assignData.xp || 0) + xpGained;
                      const { error: xpErr } = await supabase.from('users').update({ xp: newXp }).eq('uid', taskRef.assigned_to);
                      if(!xpErr) {
                          if(taskRef.assigned_to === currentUser.uid) {
                              currentUser.xp = newXp;
                              window.updateHeaderWidget();
                              window.playXpAnimation(xpGained);
                          }
                      } else {
                          console.error("Erro ao atualizar XP (Diretoria):", xpErr);
                          if(taskRef.assigned_to === currentUser.uid) {
                              window.customAlert("⚠️ Erro de Sincronização", "O XP não pôde ser salvo. Contate o administrador.", "❌");
                          }
                      }
                 }
             }
        }
        
        if(taskRef && taskRef.status !== newStatus) {
              // Gatilho 2: Notificar Diretor (mesmo sendo a própria view do diretor)
              const { data: director } = await supabase.from('users').select('uid').eq('dept', currentUser.dept).eq('role', 'Diretor').single();
              if(director) {
                   window.triggerNotification(director.uid, 'Evolução de Demanda (Diretoria)', `A demanda "${taskRef.title}" mudou para ${newStatus}`);
              }
        }

        const { error } = await supabase.from('department_tasks').update(updateData).eq('id', id);
        
        if (error) window.showToast("Erro ao atualizar status: " + error.message, 'error');
        else renderDiretoria(document.getElementById('dashboard-content'));
    }

    // Pass data universally for Modal
    window.diretoriaData = { deptTasks, deptMembers };
}

// --- MINHAS DEMANDAS & ANALYTICS ---

async function renderMinhasDemandas(container) {
    document.getElementById('page-title').innerText = 'Minhas Demandas (Kanban)';
    if (!currentUser) return;

    const { data: myTasks, error } = await supabase
        .from('department_tasks')
        .select('*')
        .eq('assigned_to', currentUser.uid)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<div class="card">Erro ao carregar demandas.</div>';
        return;
    }

    const columns = ['Nem comecei', 'Em andamento', 'Quase concluído', 'Concluído'];
    
    container.innerHTML = `
        <div class="kanban-board">
            ${columns.map(col => `
                <div class="kanban-column" ondragover="window.allowDropTask(event)" ondrop="window.dropTask(event, '${col}')">
                    <h4>${col}</h4>
                    <div class="kanban-cards-container" id="kcol-${col}">
                        ${myTasks?.filter(p => p.status === col).map(p => {
                            let colIdx = columns.indexOf(col);
                            let backBtn = colIdx > 0 ? `<button onclick="window.moveTaskMobile('${p.id}', '${columns[colIdx-1]}')" style="background:transparent; border:none; padding:0; font-size:1.2rem; cursor:pointer;" title="Recuar">⬅️</button>` : '';
                            let nextBtn = colIdx < columns.length - 1 ? `<button onclick="window.moveTaskMobile('${p.id}', '${columns[colIdx+1]}')" style="background:transparent; border:none; padding:0; font-size:1.2rem; cursor:pointer;" title="Avançar">➡️</button>` : '';

                            return `
                            <div class="kanban-card" draggable="true" ondragstart="window.dragTask(event, '${p.id}')">
                                <h5>${p.title}</h5>
                                <p>${p.description || 'Sem descrição'}</p>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="font-size: 0.7rem; color: #9ca3af;">🕒 ${new Date(p.created_at).toLocaleDateString('pt-br')}</span>
                                    <button onclick="window.openNotesModal('${p.id}', \`${(p.notes || '').replace(/\\`/g, '\\\\`')}\`)" style="padding: 0.2rem 0.5rem; font-size: 0.7rem; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: none; border-radius: 4px;">📝 Notas</button>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem;">
                                    <div>${backBtn}</div>
                                    <span style="font-size: 0.7rem; color: var(--text-muted);">Mover Kanban</span>
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
}

// Global Task Drag & Drop Logic
window.allowDropTask = (e) => e.preventDefault();
window.dragTask = (e, taskId) => e.dataTransfer.setData("text/plain", taskId);

window.moveTaskMobile = (id, newStatus) => {
    window.dropTask({ preventDefault: () => {}, dataTransfer: { getData: () => id } }, newStatus);
}

window.dropTask = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const updateData = { status: newStatus };
    const now = new Date().toISOString();
    if (newStatus === 'Em andamento') updateData.started_at = now;
    if (newStatus === 'Quase concluído') updateData.almost_done_at = now;
    if (newStatus === 'Concluído') updateData.completed_at = now;

    // GAMIFICAÇÃO & GATILHO 2
    const { data: currentTask } = await supabase.from('department_tasks').select('*').eq('id', taskId).single();
    if (currentTask && currentTask.status !== newStatus) {
         let xpGained = 0;
         let phaseMsg = "";
         if (newStatus === 'Em andamento' && !currentTask.started_at) { xpGained = 10; phaseMsg = 'Em andamento'; }
         else if (newStatus === 'Quase concluído' && !currentTask.almost_done_at) { xpGained = 20; phaseMsg = 'Quase concluído'; }
         else if (newStatus === 'Concluído' && !currentTask.completed_at) { xpGained = 30; phaseMsg = 'Concluída'; }

         if (xpGained > 0) {
             const newXp = (currentUser.xp || 0) + xpGained;
             const { error: xpErr } = await supabase.from('users').update({ xp: newXp }).eq('uid', currentUser.uid);
             if(!xpErr) {
                 currentUser.xp = newXp; 
                 window.updateHeaderWidget(); 
                 window.playXpAnimation(xpGained);
             } else {
                 console.error("Erro ao atualizar XP:", xpErr);
                 window.customAlert("⚠️ Erro de Sincronização", "O XP não pôde ser salvo no banco. Verifique as permissões (RLS).", "❌");
             }
         }
    }
    
    // Notificar os Diretores do Departamento
    if (currentTask && currentTask.status !== newStatus) {
         const { data: directors } = await supabase.from('users').select('uid').eq('dept', currentTask.department).in('role', ['Diretor', 'Presidente']);
         if(directors) {
             directors.forEach(d => {
                 window.triggerNotification(d.uid, 'Evolução de Demanda 📌', `${currentUser.name} moveu a demanda "${currentTask.title}" para o status: ${newStatus}`);
             });
         }
    }

    const { error } = await supabase.from('department_tasks').update(updateData).eq('id', taskId);
    if (error) window.showToast("Erro: " + error.message, 'error');
    else loadContent(); // Recarrega a view atual (demandas)
};

// Notes modal logic
let editingTaskId = null;
window.openNotesModal = (taskId, currentNotes) => {
    editingTaskId = taskId;
    document.getElementById('task-notes-input').value = currentNotes || '';
    document.getElementById('notes-modal').style.display = 'flex';
}
window.closeNotesModal = () => { document.getElementById('notes-modal').style.display = 'none'; editingTaskId = null; }

window.saveTaskNotes = async () => {
    if (!editingTaskId) return;
    const notes = document.getElementById('task-notes-input').value;
    const { error } = await supabase.from('department_tasks').update({ notes }).eq('id', editingTaskId);
    
    if (error) window.showToast("Erro ao salvar: " + error.message, 'error');
    else {
        window.showToast("Notas salvas!", 'success');
        window.closeNotesModal();
        if (currentPage === 'demandas') renderMinhasDemandas(document.getElementById('dashboard-content'));
    }
}

// Analise de Desempenho (Diretor / RH)
window.analisarDesempenho = async (userId) => {
    if (!window.diretoriaData) return;
    
    const member = window.diretoriaData.deptMembers.find(m => m.uid === userId);
    const mTasks = window.diretoriaData.deptTasks.filter(t => t.assigned_to === userId);
    
    if (!member) return;

    // Fill header
    document.getElementById('perf-name').innerText = member.name;
    document.getElementById('perf-role').innerText = member.role + ' - ' + member.dept;
    document.getElementById('perf-avatar').src = member.photoURL || 'https://via.placeholder.com/60';

    // Populate History
    const historyHtml = mTasks.map(t => {
        let statusColor = '#9ca3af';
        if(t.status === 'Nem comecei') statusColor = '#ef4444';
        else if(t.status === 'Em andamento') statusColor = '#3b82f6';
        else if(t.status === 'Quase concluído') statusColor = '#f59e0b';
        else if(t.status === 'Concluído') statusColor = '#10b981';

        return `
            <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0.8rem 0;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.3rem;">
                    <b>${t.title}</b>
                    <span style="font-size: 0.75rem; background: ${statusColor}20; color: ${statusColor}; padding: 0.2rem 0.5rem; border-radius: 12px;">${t.status}</span>
                </div>
                ${t.notes ? `<p style="font-size:0.8rem; color:#9ca3af; margin:0; padding:0.5rem; background:rgba(0,0,0,0.3); border-radius:4px;"><i>"${t.notes}"</i></p>` : `<span style="font-size:0.75rem; color:#6b7280;">Nenhuma nota do membro.</span>`}
            </div>
        `;
    }).join('') || '<p style="color:#6b7280; font-size:0.85rem;">Nenhuma demanda associada.</p>';
    document.getElementById('perf-history').innerHTML = historyHtml;

    // Calculate Analytics
    const completedTasks = mTasks.filter(t => t.status === 'Concluído' && t.completed_at);
    
    let totalDeliveryHours = 0;
    let totalStartHours = 0;
    let totalExecHours = 0;
    let totalRevHours = 0;

    const diffHours = (from, to) => Math.max(0, (new Date(to) - new Date(from)) / (1000 * 60 * 60));

    let phasesHtml = '';
    
    if (completedTasks.length === 0) {
        document.getElementById('perf-phases').innerHTML = '<p style="color:#6b7280; font-size:0.85rem;">Sem tarefas concluídas com tracking disponível.</p>';
        document.getElementById('perf-kpis').innerHTML = `
            <div class="card" style="padding: 1rem;"><small>Entregas</small><h2>0</h2></div>
        `;
    } else {
        const lastTask = completedTasks[0]; // ordered by created_at desc, assumes recent
        let lastTaskTime = 0;

        completedTasks.forEach(t => {
            const startH = diffHours(t.created_at, t.started_at || t.completed_at);
            const execH = diffHours(t.started_at || t.created_at, t.almost_done_at || t.completed_at);
            const revH = diffHours(t.almost_done_at || t.started_at || t.created_at, t.completed_at);
            
            totalStartHours += startH;
            totalExecHours += execH;
            totalRevHours += revH;

            const totalIter = startH + execH + revH;
            totalDeliveryHours += totalIter;

            if (t.id === lastTask.id) lastTaskTime = totalIter;
        });

        const n = completedTasks.length;
        const avgTotal = totalDeliveryHours / n;
        const avgStart = totalStartHours / n;
        const avgExec = totalExecHours / n;
        const avgRev = totalRevHours / n;

        // Bottleneck math
        let bottleneckLabel = 'Início (Procrastinação)';
        let maxAvg = avgStart;

        if (avgExec > maxAvg) { maxAvg = avgExec; bottleneckLabel = 'Execução (Andamento)'; }
        if (avgRev > maxAvg) { maxAvg = avgRev; bottleneckLabel = 'Revisão (Finalização)'; }

        // Tendencia
        const variation = avgTotal > 0 ? ((lastTaskTime - avgTotal) / avgTotal) * 100 : 0;
        const trendText = variation > 0 ? `Atrasou ${variation.toFixed(1)}% a mais que a média` : `Entregou ${Math.abs(variation).toFixed(1)}% mais RÁPIDO`;
        const trendColor = variation <= 0 ? '#10b981' : '#ef4444';

        document.getElementById('perf-kpis').innerHTML = `
            <div class="card" style="padding: 1rem;"><small>Entregas Históricas</small><h2 style="font-size:1.5rem;">${n}</h2></div>
            <div class="card" style="padding: 1rem;"><small>Tempo Médio (Total)</small><h2 style="font-size:1.5rem; color:#3b82f6;">${avgTotal.toFixed(1)}h</h2></div>
            <div class="card" style="padding: 1rem; border-left: 3px solid ${trendColor};"><small>Última Entrega</small><h4 style="font-size:0.9rem; color:${trendColor}; margin-top:0.5rem;">${trendText}</h4></div>
        `;

        document.getElementById('perf-phases').innerHTML = `
            <p style="margin-bottom:0.5rem; font-size:0.85rem;"><b>Gargalo Principal:</b> <span style="color:#ef4444">${bottleneckLabel}</span> (${maxAvg.toFixed(1)}h em média)</p>
            <div style="margin-top: 1.5rem;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.3rem;"><span style="color:#9ca3af;">Demora p/ Iniciar</span><span>${avgStart.toFixed(1)}h</span></div>
                <div style="width:100%; background:rgba(255,255,255,0.05); height:8px; border-radius:4px; margin-bottom:1rem;"><div style="width:${Math.min(100, (avgStart/avgTotal)*100)}%; background:#ef4444; height:100%; border-radius:4px;"></div></div>

                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.3rem;"><span style="color:#9ca3af;">Tempo de Execução</span><span>${avgExec.toFixed(1)}h</span></div>
                <div style="width:100%; background:rgba(255,255,255,0.05); height:8px; border-radius:4px; margin-bottom:1rem;"><div style="width:${Math.min(100, (avgExec/avgTotal)*100)}%; background:#3b82f6; height:100%; border-radius:4px;"></div></div>

                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.3rem;"><span style="color:#9ca3af;">Revisão / Finishing</span><span>${avgRev.toFixed(1)}h</span></div>
                <div style="width:100%; background:rgba(255,255,255,0.05); height:8px; border-radius:4px; margin-bottom:1rem;"><div style="width:${Math.min(100, (avgRev/avgTotal)*100)}%; background:#f59e0b; height:100%; border-radius:4px;"></div></div>
            </div>
        `;
    }

    document.getElementById('perf-modal').style.display = 'flex';
}
